/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { FieldsMetadataServerSetup } from '@kbn/fields-metadata-plugin/server';
import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { getAncestors, getInheritedFieldsFromAncestors, Streams } from '@kbn/streams-schema';
import type { StreamsPluginStartDependencies } from './types';
import { createStreamsStorageClient } from './lib/streams/storage/streams_storage_client';

interface RegistrationDeps {
  core: CoreSetup<StreamsPluginStartDependencies>;
  fieldsMetadata: FieldsMetadataServerSetup;
  logger: Logger;
}

/**
 * Registers a streams field extractor with the fields_metadata service.
 * This allows the ESQL editor and field sidebar to display field descriptions
 * for streams.
 */
export const registerFieldsMetadataExtractors = ({
  core,
  fieldsMetadata,
  logger,
}: RegistrationDeps) => {
  fieldsMetadata.registerStreamsFieldsExtractor(async ({ streamName }) => {
    try {
      const [coreStart] = await core.getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const storageClient = createStreamsStorageClient(esClient, logger);

      // Fetch the stream definition
      const streamResponse = await storageClient.get({ id: streamName }).catch(() => null);

      if (!streamResponse?._source) {
        return {};
      }

      const streamDefinition = streamResponse._source;

      // Only wired streams have field definitions
      if (!Streams.WiredStream.Definition.is(streamDefinition)) {
        return {};
      }

      // Fetch ancestors to get inherited fields
      const ancestorIds = getAncestors(streamName);
      let ancestors: Streams.WiredStream.Definition[] = [];

      if (ancestorIds.length > 0) {
        const ancestorsResponse = await storageClient
          .search({
            size: ancestorIds.length,
            track_total_hits: false,
            query: {
              bool: {
                filter: [{ terms: { name: ancestorIds } }],
              },
            },
          })
          .catch(() => ({ hits: { hits: [] } }));

        ancestors = ancestorsResponse.hits.hits
          .map((hit) => hit._source)
          .filter((source): source is Streams.WiredStream.Definition =>
            Streams.WiredStream.Definition.is(source)
          );
      }

      // Get inherited fields from ancestors
      const inheritedFields = getInheritedFieldsFromAncestors(ancestors);

      // Combine own fields and inherited fields into field metadata
      // ExtractedStreamFields is Record<FieldName, FieldMetadataPlain>
      const fieldsMetadataResult: Record<string, FieldMetadataPlain> = {};

      // Add inherited fields first (they can be overridden by own fields)
      for (const [fieldName, fieldConfig] of Object.entries(inheritedFields)) {
        fieldsMetadataResult[fieldName] = {
          name: fieldName,
          type: fieldConfig.type !== 'system' ? fieldConfig.type : undefined,
          description: (fieldConfig as { description?: string }).description,
        };
      }

      // Add own fields (they override inherited fields)
      for (const [fieldName, fieldConfig] of Object.entries(streamDefinition.ingest.wired.fields)) {
        fieldsMetadataResult[fieldName] = {
          name: fieldName,
          type: fieldConfig.type !== 'system' ? fieldConfig.type : undefined,
          description: (fieldConfig as { description?: string }).description,
        };
      }

      return fieldsMetadataResult;
    } catch (error) {
      logger.warn(`registerStreamsFieldsExtractor error: ${error}`);
      return {};
    }
  });
};
