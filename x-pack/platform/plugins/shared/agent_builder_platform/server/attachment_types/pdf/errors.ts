/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_PDF_BYTES } from '@kbn/agent-builder-common/attachments';

export type PdfErrorCode =
  | 'not_available'
  | 'file_not_found'
  | 'too_big'
  | 'not_a_pdf'
  | 'extraction_failed'
  | 'timeout';

export class PdfError extends Error {
  constructor(public readonly code: PdfErrorCode, message: string) {
    super(message);
    this.name = 'PdfError';
  }
}

export const pdfErrors = {
  notAvailable: () =>
    new PdfError('not_available', 'PDF reading is not available on this deployment.'),
  fileNotFound: () => new PdfError('file_not_found', 'PDF file not found.'),
  tooBig: () =>
    new PdfError('too_big', `The PDF is larger than ${MAX_PDF_BYTES / (1024 * 1024)} MB.`),
  notAPdf: () => new PdfError('not_a_pdf', 'The file is not a valid PDF.'),
  extractionFailed: () =>
    new PdfError('extraction_failed', 'Could not read the PDF. Try again later.'),
  timeout: () => new PdfError('timeout', 'Reading the PDF took too long. Try a smaller PDF.'),
};

export const isPdfError = (error: unknown): error is PdfError => error instanceof PdfError;
