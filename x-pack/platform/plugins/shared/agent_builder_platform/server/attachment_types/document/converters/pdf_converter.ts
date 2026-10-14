/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { documentErrors } from '../errors';
import { extractDocument } from '../extraction/extract_document';
import { isDocumentExtractionAvailable } from '../extraction/extraction_availability';
import type { DocumentConverter } from './types';

const PDF_HEADER = '%PDF-';

export const createPdfConverter = ({
  getEsClient,
  logger,
}: {
  getEsClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
}): DocumentConverter => ({
  isAvailable: isDocumentExtractionAvailable,
  toText: async ({ bytes, fileId, fileName, signal }) => {
    if (bytes.subarray(0, PDF_HEADER.length).toString('latin1') !== PDF_HEADER) {
      throw documentErrors.invalidContent();
    }
    return extractDocument({
      esClient: await getEsClient(),
      pdf: bytes,
      fileId,
      fileName,
      signal,
      logger,
    });
  },
});
