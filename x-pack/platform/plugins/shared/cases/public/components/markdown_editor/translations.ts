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

export const RENDER_ERROR_TITLE = i18n.translate('xpack.cases.markdownEditor.renderError.title', {
  defaultMessage: 'This content could not be displayed',
});

export const RENDER_ERROR_DESCRIPTION = i18n.translate(
  'xpack.cases.markdownEditor.renderError.description',
  {
    defaultMessage:
      'Something went wrong while rendering the markdown. The original content is still saved and can be edited or removed.',
  }
);

export const SHOW_RAW_CONTENT = i18n.translate(
  'xpack.cases.markdownEditor.renderError.showRawContent',
  {
    defaultMessage: 'Show source',
  }
);

export const HIDE_RAW_CONTENT = i18n.translate(
  'xpack.cases.markdownEditor.renderError.hideRawContent',
  {
    defaultMessage: 'Hide source',
  }
);
