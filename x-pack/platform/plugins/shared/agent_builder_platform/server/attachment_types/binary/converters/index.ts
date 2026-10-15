/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedDocumentMimeType } from '@kbn/agent-builder-common/attachments';
import { SUPPORTED_DOCUMENT_MIME_TYPES } from '@kbn/agent-builder-common/attachments';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { DocumentExtractionAvailability } from '../extraction/extraction_availability';
import { createPdfConverter } from './pdf_converter';
import type { DocumentConverters } from './types';

export type { DocumentConverter, DocumentConverters, DocumentToTextParams } from './types';

export const createDocumentConverters = ({
  getEsClient,
  extractionAvailability,
  logger,
}: {
  getEsClient: () => Promise<ElasticsearchClient>;
  extractionAvailability: DocumentExtractionAvailability;
  logger: Logger;
}): DocumentConverters => {
  return {
    'application/pdf': createPdfConverter({ getEsClient, extractionAvailability, logger }),
  };
};

export const getAvailableDocumentMimeTypes = (
  converters: DocumentConverters
): SupportedDocumentMimeType[] =>
  SUPPORTED_DOCUMENT_MIME_TYPES.filter((mimeType) => converters[mimeType].isAvailable());
