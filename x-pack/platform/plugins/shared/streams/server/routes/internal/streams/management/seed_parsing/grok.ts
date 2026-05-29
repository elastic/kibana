/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assembleGrokProcessor, type GrokPatternNode } from '@kbn/grok-heuristics';
import { simulateProcessing } from '../../processing/simulation_handler';
import { reviewGrokFields } from '../../processing/grok_suggestions_handler';
import {
  formatInferenceErrorMeta,
  getErrorMessage,
  type CommonSeedParsingArgs,
  type SeedParsingCandidate,
} from './shared';

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
