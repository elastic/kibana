/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { InferenceClient } from '@kbn/inference-common';
import { isInferenceError } from '@kbn/inference-common';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { type GrokProcessor, type DissectProcessor } from '@kbn/streamlang';
import { assembleGrokProcessor, type GrokPatternNode } from '@kbn/grok-heuristics';
import {
  getReviewFields as getDissectReviewFields,
  getDissectProcessorWithReview,
} from '@kbn/dissect-heuristics';
import type { StreamsClient } from '../../../../lib/streams/client';
import type { IPatternExtractionService } from '../../../../lib/pattern_extraction/pattern_extraction_service';
import { simulateProcessing } from '../processing/simulation_handler';
import { reviewGrokFields } from '../processing/grok_suggestions_handler';
import { reviewDissectFields } from '../processing/dissect_suggestions_handler';

/**
 * Identifier used for the seed parsing processor when it is simulated alone
 * to produce fully-parsed sample documents for the post-parse sub-agent.
 */
export const SYSTEM_PARSING_PRE_SIM_ID = 'system-suggested-parsing-pre-step';

/**
 * Maximum number of sample messages forwarded to the LLM during dissect
 * field review. Bounds review prompt size and cost.
 */
export const MAX_REVIEW_MESSAGES = 10;

/**
 * Number of sample values per dissect field used to anchor the LLM review.
 */
export const NUM_REVIEW_EXAMPLES = 10;

/**
 * Outcome of running a single seed-pattern strategy (grok or dissect) end-to-end:
 * heuristic extraction → LLM field review → simulation against sample documents.
 */
export type SeedParsingCandidate =
  | { type: 'grok'; processor: GrokProcessor; parsedRate: number }
  | { type: 'dissect'; processor: DissectProcessor; parsedRate: number };

interface CommonSeedParsingArgs {
  messages: string[];
  fieldName: string;
  streamName: string;
  connectorId: string;
  documents: FlattenRecord[];
  patternExtractionService: IPatternExtractionService;
  inferenceClient: InferenceClient;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  useOtelFieldNames: boolean;
  signal: AbortSignal;
  logger: Logger;
}

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const formatInferenceErrorMeta = (error: unknown): string => {
  if (isInferenceError(error)) {
    const parts: string[] = [];
    if (error.code) parts.push(`code=${error.code}`);
    if (error.meta?.status) parts.push(`status=${error.meta.status}`);
    return parts.length > 0 ? ` ${parts.join(' ')}` : '';
  }
  return '';
};

/**
 * Extract grok patterns server-side via Piscina workers, call the LLM to
 * review the resulting fields, simulate the assembled processor against the
 * provided sample documents, and return the processor with its observed
 * parse rate.
 *
 * Returns `null` when extraction yields no candidates, when the LLM review
 * collapses to an empty processor, or when extraction itself fails (logged
 * as a warning — callers should treat this as "no grok seed available").
 */
export const processGrokPatterns = async ({
  messages,
  fieldName,
  streamName,
  connectorId,
  documents,
  patternExtractionService,
  inferenceClient,
  scopedClusterClient,
  streamsClient,
  fieldsMetadataClient,
  useOtelFieldNames,
  signal,
  logger,
}: CommonSeedParsingArgs): Promise<SeedParsingCandidate | null> => {
  const log = logger.get('grok');
  const SUGGESTED_GROK_PROCESSOR_ID = 'grok-processor';

  let patternGroups: Array<{ messages: string[]; nodes: GrokPatternNode[] }>;
  try {
    const extraction = await patternExtractionService.extractGrokPatterns(messages);
    patternGroups = extraction.patternGroups;
  } catch (err) {
    log.warn(
      `Extraction failed, skipping grok seed (stream=${streamName}): ${getErrorMessage(err)}`
    );
    return null;
  }

  if (patternGroups.length === 0) {
    return null;
  }

  const combinedGrokProcessor = await assembleGrokProcessor({
    from: fieldName,
    patternGroups,
    reviewFn: async (reviewFields, reviewMessages) => {
      log.debug(
        `Reviewing group (stream=${streamName} messages=${reviewMessages.length} connectorId=${connectorId})`
      );
      try {
        const result = await reviewGrokFields({
          streamName,
          connectorId,
          fieldName,
          sampleMessages: reviewMessages,
          reviewFields,
          inferenceClient,
          useOtelFieldNames,
          fieldsMetadataClient,
          signal,
        });
        log.debug(`LLM review response received (stream=${streamName} connectorId=${connectorId})`);
        return result;
      } catch (error) {
        const meta = formatInferenceErrorMeta(error);
        log.error(
          `LLM review failed` +
            ` (stream=${streamName} connectorId=${connectorId}${meta}): ${getErrorMessage(error)}`
        );
        throw error;
      }
    },
  });

  if (!combinedGrokProcessor) {
    log.debug(`No grok processor produced (stream=${streamName} connectorId=${connectorId})`);
    return null;
  }

  log.debug(
    `Assembled grok processor (stream=${streamName} patterns=${combinedGrokProcessor.patterns.length} connectorId=${connectorId})`
  );

  const simulationResult = await simulateProcessing({
    params: {
      path: { name: streamName },
      body: {
        documents,
        processing: {
          steps: [
            {
              ...combinedGrokProcessor,
              customIdentifier: SUGGESTED_GROK_PROCESSOR_ID,
            },
          ],
        },
      },
    },
    esClient: scopedClusterClient.asCurrentUser,
    streamsClient,
    fieldsMetadataClient,
  });

  const parsedRate =
    simulationResult.processors_metrics[SUGGESTED_GROK_PROCESSOR_ID]?.parsed_rate ?? 0;

  log.debug(
    `Simulation complete (stream=${streamName} parsedRate=${parsedRate} connectorId=${connectorId})`
  );

  return {
    type: 'grok',
    processor: combinedGrokProcessor,
    parsedRate,
  };
};

/**
 * Extract a dissect pattern server-side via Piscina workers, call the LLM to
 * review the resulting fields, simulate the dissect processor against the
 * provided sample documents, and return the processor with its observed
 * parse rate.
 *
 * Returns `null` when extraction produces no usable AST, when the review
 * collapses the pattern to empty, or when no messages were available.
 */
export const processDissectPattern = async ({
  messages,
  fieldName,
  streamName,
  connectorId,
  documents,
  patternExtractionService,
  inferenceClient,
  scopedClusterClient,
  streamsClient,
  fieldsMetadataClient,
  useOtelFieldNames,
  signal,
  logger,
}: CommonSeedParsingArgs): Promise<SeedParsingCandidate | null> => {
  const log = logger.get('dissect');
  const SUGGESTED_DISSECT_PROCESSOR_ID = 'dissect-processor';

  if (messages.length === 0) {
    return null;
  }

  let dissectPattern;
  let largestGroupMessages: string[];
  try {
    const extraction = await patternExtractionService.extractDissectPattern(messages);
    dissectPattern = extraction.dissectPattern;
    largestGroupMessages = extraction.largestGroupMessages;
  } catch (err) {
    log.warn(
      `Extraction failed, skipping dissect seed (stream=${streamName}): ${getErrorMessage(err)}`
    );
    return null;
  }

  if (!dissectPattern.ast.nodes.length) {
    return null;
  }

  const reviewFields = getDissectReviewFields(dissectPattern, NUM_REVIEW_EXAMPLES);

  let reviewResult;
  try {
    log.debug(
      `Reviewing fields (stream=${streamName} messages=${largestGroupMessages.length} connectorId=${connectorId})`
    );
    reviewResult = await reviewDissectFields({
      streamName,
      connectorId,
      fieldName,
      sampleMessages: largestGroupMessages.slice(0, MAX_REVIEW_MESSAGES),
      reviewFields,
      inferenceClient,
      useOtelFieldNames,
      fieldsMetadataClient,
      signal,
    });
    log.debug(`LLM review response received (stream=${streamName} connectorId=${connectorId})`);
  } catch (error) {
    const meta = formatInferenceErrorMeta(error);
    log.error(
      `LLM review failed` +
        ` (stream=${streamName} connectorId=${connectorId}${meta}): ${getErrorMessage(error)}`
    );
    throw error;
  }

  const result = getDissectProcessorWithReview(dissectPattern, reviewResult, fieldName);

  if (!result.pattern || result.pattern.trim().length === 0) {
    log.debug(`No dissect processor produced (stream=${streamName} connectorId=${connectorId})`);
    return null;
  }

  const dissectProcessor: DissectProcessor = {
    action: 'dissect',
    from: fieldName,
    pattern: result.pattern,
    append_separator: result.processor.dissect.append_separator,
    description: result.description,
  };

  log.debug(`Assembled dissect processor (stream=${streamName} connectorId=${connectorId})`);

  const simulationResult = await simulateProcessing({
    params: {
      path: { name: streamName },
      body: {
        documents,
        processing: {
          steps: [
            {
              ...dissectProcessor,
              customIdentifier: SUGGESTED_DISSECT_PROCESSOR_ID,
            },
          ],
        },
      },
    },
    esClient: scopedClusterClient.asCurrentUser,
    streamsClient,
    fieldsMetadataClient,
  });

  const parsedRate =
    simulationResult.processors_metrics[SUGGESTED_DISSECT_PROCESSOR_ID]?.parsed_rate ?? 0;

  log.debug(
    `Simulation complete (stream=${streamName} parsedRate=${parsedRate} connectorId=${connectorId})`
  );

  return {
    type: 'dissect',
    processor: dissectProcessor,
    parsedRate,
  };
};

/**
 * Run the chosen seed grok/dissect processor alone against the sample
 * documents to extract the subset that fully parsed. Those parsed shapes
 * are then handed to the post-parse sub-agent so it designs subsequent
 * processors against the post-extraction document layout, never against
 * the raw text.
 */
export const extractParsedSampleDocuments = async ({
  streamName,
  documents,
  parsingProcessor,
  scopedClusterClient,
  streamsClient,
  fieldsMetadataClient,
  logger,
}: {
  streamName: string;
  documents: FlattenRecord[];
  parsingProcessor: GrokProcessor | DissectProcessor;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  logger: Logger;
}): Promise<{ parsedDocuments: FlattenRecord[]; definitionError: boolean }> => {
  const simulationResult = await simulateProcessing({
    params: {
      path: { name: streamName },
      body: {
        documents,
        processing: {
          steps: [{ ...parsingProcessor, customIdentifier: SYSTEM_PARSING_PRE_SIM_ID }],
        },
      },
    },
    esClient: scopedClusterClient.asCurrentUser,
    streamsClient,
    fieldsMetadataClient,
  });

  if (simulationResult.definition_error) {
    logger.warn(
      `Parsing pre-simulation failed (stream=${streamName}): ${simulationResult.definition_error.message}`
    );
    return { parsedDocuments: [], definitionError: true };
  }

  return {
    parsedDocuments: simulationResult.documents
      .filter((doc) => doc.status === 'parsed')
      .map((doc) => doc.value),
    definitionError: false,
  };
};
