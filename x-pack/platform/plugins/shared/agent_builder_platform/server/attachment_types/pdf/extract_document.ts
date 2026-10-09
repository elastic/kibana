/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  ElasticGenAIAttributes,
  GenAISemanticConventions,
  withActiveInferenceSpan,
} from '@kbn/inference-tracing';
import type { Logger } from '@kbn/logging';
import {
  DOCUMENT_EXTRACTION_ENDPOINT_ID,
  PDF_EXTRACTION_TIMEOUT_MS,
  // FAKE_EXTRACTION:start - remove when Jina Reader document_extraction is live
  USE_FAKE_EXTRACTION,
  // FAKE_EXTRACTION:end
} from './constants';
import { isPdfError, pdfErrors } from './errors';
// FAKE_EXTRACTION:start - remove when Jina Reader document_extraction is live
import { fakeExtractDocument } from './fake_extract_document';
// FAKE_EXTRACTION:end

interface DocumentExtractionResponse {
  document_extraction?: Array<{ content?: string; format?: string }>;
}

const getErrorDetails = (error: unknown): string => {
  if (error instanceof Error) {
    const body = (error as { meta?: { body?: unknown } }).meta?.body;
    return body ? `${error.message} ${JSON.stringify(body)}` : error.message;
  }
  return String(error);
};

/**
 * Reads a PDF with the ES document extraction endpoint and returns markdown.
 * Stops when `signal` fires or the time budget is used up.
 */
export const extractDocument = ({
  esClient,
  pdf,
  fileId,
  fileName,
  signal,
  logger,
}: {
  esClient: ElasticsearchClient;
  pdf: Buffer;
  fileId: string;
  fileName: string;
  signal?: AbortSignal;
  logger: Logger;
}): Promise<string> =>
  withActiveInferenceSpan(
    'pdf_extraction',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
        [GenAISemanticConventions.GenAIRequestModel]: DOCUMENT_EXTRACTION_ENDPOINT_ID,
        'pdf.file_id': fileId,
        'pdf.size_bytes': pdf.length,
      },
    },
    async () => {
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, PDF_EXTRACTION_TIMEOUT_MS);
      const abortOnCallerAbort = () => controller.abort();
      if (signal?.aborted) {
        controller.abort();
      }
      signal?.addEventListener('abort', abortOnCallerAbort, { once: true });

      try {
        // FAKE_EXTRACTION:start - remove when Jina Reader document_extraction is live
        if (USE_FAKE_EXTRACTION) {
          return await fakeExtractDocument({ fileName, signal: controller.signal });
        }
        // FAKE_EXTRACTION:end

        controller.signal.throwIfAborted();
        const response = await esClient.transport.request<DocumentExtractionResponse>(
          {
            method: 'POST',
            path: `/_inference/document_extraction/${encodeURIComponent(
              DOCUMENT_EXTRACTION_ENDPOINT_ID
            )}`,
            querystring: { timeout: `${PDF_EXTRACTION_TIMEOUT_MS / 1000}s` },
            body: {
              input: [
                {
                  content: {
                    type: 'pdf',
                    format: 'base64',
                    value: `data:application/pdf;base64,${pdf.toString('base64')}`,
                  },
                },
              ],
            },
          },
          { signal: controller.signal, requestTimeout: PDF_EXTRACTION_TIMEOUT_MS }
        );

        const content = response.document_extraction?.[0]?.content;
        if (!content) {
          logger.error('The document extraction response has no content.');
          throw pdfErrors.extractionFailed();
        }
        return content;
      } catch (error) {
        if (timedOut || (error as Error).name === 'TimeoutError') throw pdfErrors.timeout();
        if (signal?.aborted || isPdfError(error)) throw error;
        logger.error(`Document extraction failed for the PDF: ${getErrorDetails(error)}`);
        throw pdfErrors.extractionFailed();
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abortOnCallerAbort);
      }
    }
  );
