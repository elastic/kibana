/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAttachmentInvalidError, createInternalError } from '@kbn/agent-builder-common';

const BYTES_PER_MB = 1024 * 1024;

export const binaryErrors = {
  notAvailable: () =>
    createInternalError('Reading this file type is not available on this deployment.', {
      binaryErrorCode: 'not_available',
      statusCode: 503,
    }),
  fileNotFound: () =>
    createAttachmentInvalidError('File not found.', { binaryErrorCode: 'file_not_found' }),
  unsupportedType: () =>
    createAttachmentInvalidError('This file type is not supported.', {
      binaryErrorCode: 'unsupported_type',
    }),
  tooBig: (maxBytes: number) =>
    createAttachmentInvalidError(`The file is larger than ${maxBytes / BYTES_PER_MB} MB.`, {
      binaryErrorCode: 'too_big',
    }),
  invalidContent: () =>
    createAttachmentInvalidError('The file is damaged or has the wrong file type.', {
      binaryErrorCode: 'invalid_content',
    }),
  extractionFailed: () =>
    createInternalError('Could not read the file. Try again later.', {
      binaryErrorCode: 'extraction_failed',
    }),
  textTooLong: () =>
    createAttachmentInvalidError('The text of the file is too long. Try a smaller file.', {
      binaryErrorCode: 'text_too_long',
    }),
  timeout: () =>
    createInternalError('Reading the file took too long. Try a smaller file.', {
      binaryErrorCode: 'timeout',
      statusCode: 504,
    }),
};
