/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PREVIEW = i18n.translate('xpack.cases.markdownEditor.preview', {
  defaultMessage: 'Preview',
});

export const NO_SIMULTANEOUS_UPLOADS_MESSAGE = i18n.translate(
  'xpack.cases.markdownEditor.noSimultaneousUploads.message',
  {
    defaultMessage: 'Simultaneous file uploads are not supported.',
  }
);

export const UNSUPPORTED_MIME_TYPE_MESSAGE = i18n.translate(
  'xpack.cases.markdownEditor.unsupportedMimeType.message',
  {
    defaultMessage: 'Only PNG and JPG images are supported.',
  }
);
