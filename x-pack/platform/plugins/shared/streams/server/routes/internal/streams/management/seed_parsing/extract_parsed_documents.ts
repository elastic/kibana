/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { GrokProcessor, DissectProcessor } from '@kbn/streamlang';
import type { StreamsClient } from '../../../../../lib/streams/client';
import { simulateProcessing } from '../../processing/simulation_handler';
import { SYSTEM_PARSING_PRE_SIM_ID } from './shared';

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
