/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAttachmentInvalidError, createInternalError } from '@kbn/agent-builder-common';

const BYTES_PER_MB = 1024 * 1024;

export const documentErrors = {
  notAvailable: () =>
    createInternalError('Reading this file type is not available on this deployment.', {
      documentErrorCode: 'not_available',
      statusCode: 503,
    }),
  fileNotFound: () =>
    createAttachmentInvalidError('File not found.', { documentErrorCode: 'file_not_found' }),
  unsupportedType: () =>
    createAttachmentInvalidError('This file type is not supported.', {
      documentErrorCode: 'unsupported_type',
    }),
  tooBig: (maxBytes: number) =>
    createAttachmentInvalidError(`The file is larger than ${maxBytes / BYTES_PER_MB} MB.`, {
      documentErrorCode: 'too_big',
    }),
  invalidContent: () =>
    createAttachmentInvalidError('The file is damaged or has the wrong file type.', {
      documentErrorCode: 'invalid_content',
    }),
  notUtf8: () =>
    createAttachmentInvalidError('The file must be UTF-8 text.', {
      documentErrorCode: 'not_utf8',
    }),
  extractionFailed: () =>
    createInternalError('Could not read the file. Try again later.', {
      documentErrorCode: 'extraction_failed',
    }),
  textTooLong: () =>
    createAttachmentInvalidError('The text of the file is too long. Try a smaller file.', {
      documentErrorCode: 'text_too_long',
    }),
  timeout: () =>
    createInternalError('Reading the file took too long. Try a smaller file.', {
      documentErrorCode: 'timeout',
      statusCode: 504,
    }),
};
