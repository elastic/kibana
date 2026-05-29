/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DissectProcessor } from '@kbn/streamlang';
import {
  getReviewFields as getDissectReviewFields,
  getDissectProcessorWithReview,
} from '@kbn/dissect-heuristics';
import { simulateProcessing } from '../../processing/simulation_handler';
import { reviewDissectFields } from '../../processing/dissect_suggestions_handler';
import {
  MAX_REVIEW_MESSAGES,
  NUM_REVIEW_EXAMPLES,
  formatInferenceErrorMeta,
  getErrorMessage,
  type CommonSeedParsingArgs,
  type SeedParsingCandidate,
} from './shared';

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
