/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import type { FieldsMetadataServerSetup } from '@kbn/fields-metadata-plugin/server';
import { Streams } from '@kbn/streams-schema';
import { createStreamsStorageClient } from './lib/streams/storage/streams_storage_client';

interface RegistrationDeps {
  fieldsMetadata: FieldsMetadataServerSetup;
  logger: Logger;
}

/**
 * Registers a streams field extractor with the fields_metadata service.
 * This allows the ESQL editor and field sidebar to display field descriptions
 * for streams. The extractor receives a request-scoped ES client so that
 * Elasticsearch-level read permissions are respected.
 */
export const registerFieldsMetadataExtractors = ({ fieldsMetadata, logger }: RegistrationDeps) => {
  fieldsMetadata.registerStreamsFieldsExtractor(async ({ streamName, esClient }) => {
    try {
      const storageClient = createStreamsStorageClient(esClient, logger);

      // Fetch the stream definition
      const streamResponse = await storageClient.get({ id: streamName }).catch(() => null);

      if (!streamResponse?._source) {
        return {};
      }

      const streamDefinition = streamResponse._source;

      // Only wired streams have field definitions
      if (
        !Streams.WiredStream.Definition.is(streamDefinition) &&
        !Streams.ClassicStream.Definition.is(streamDefinition)
      ) {
        return {};
      }

      const fieldsMetadataResult: Record<string, FieldMetadataPlain> = {};

      const allFields = [
        ...(Streams.WiredStream.Definition.is(streamDefinition)
          ? Object.entries(streamDefinition.ingest.wired.fields)
          : []),
        ...(Streams.ClassicStream.Definition.is(streamDefinition)
          ? Object.entries(streamDefinition.ingest.classic.field_overrides ?? {})
          : []),
      ];

      // Add own fields (they override inherited fields)
      for (const [fieldName, fieldConfig] of allFields) {
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
