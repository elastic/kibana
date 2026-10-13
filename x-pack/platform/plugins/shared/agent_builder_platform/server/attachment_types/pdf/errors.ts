/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAttachmentInvalidError, createInternalError } from '@kbn/agent-builder-common';
import { MAX_PDF_BYTES } from '@kbn/agent-builder-common/attachments';

export const pdfErrors = {
  notAvailable: () =>
    createInternalError('PDF reading is not available on this deployment.', {
      pdfErrorCode: 'not_available',
      statusCode: 503,
    }),
  fileNotFound: () =>
    createAttachmentInvalidError('PDF file not found.', { pdfErrorCode: 'file_not_found' }),
  tooBig: () =>
    createAttachmentInvalidError(`The PDF is larger than ${MAX_PDF_BYTES / (1024 * 1024)} MB.`, {
      pdfErrorCode: 'too_big',
    }),
  notAPdf: () =>
    createAttachmentInvalidError('The file is not a valid PDF.', { pdfErrorCode: 'not_a_pdf' }),
  extractionFailed: () =>
    createInternalError('Could not read the PDF. Try again later.', {
      pdfErrorCode: 'extraction_failed',
    }),
  textTooLong: () =>
    createAttachmentInvalidError('The text of the PDF is too long. Try a smaller PDF.', {
      pdfErrorCode: 'text_too_long',
    }),
  timeout: () =>
    createInternalError('Reading the PDF took too long. Try a smaller PDF.', {
      pdfErrorCode: 'timeout',
      statusCode: 504,
    }),
};
