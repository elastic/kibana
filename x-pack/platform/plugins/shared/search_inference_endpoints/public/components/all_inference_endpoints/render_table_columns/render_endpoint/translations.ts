/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PRECONFIGURED_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.elasticsearch.endpointInfo.preconfigured',
  {
    defaultMessage: 'PRECONFIGURED',
  }
);

export const PRECONFIGURED_TOOLTIP = i18n.translate(
  'xpack.searchInferenceEndpoints.elasticsearch.endpointInfo.preconfiguredTooltip',
  {
    defaultMessage: 'This endpoint is preconfigured by Elastic and cannot be deleted',
  }
);

export const TECH_PREVIEW_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.elasticsearch.endpointInfo.techPreview',
  {
    defaultMessage: 'TECH PREVIEW',
  }
);

export const TECH_PREVIEW_TOOLTIP = i18n.translate(
  'xpack.searchInferenceEndpoints.elasticsearch.endpointInfo.techPreviewTooltip',
  {
    defaultMessage:
      'This functionality is experimental and not supported. It may change or be removed at any time.',
  }
);

export const COPY_ID_TO_CLIPBOARD = i18n.translate(
  'xpack.searchInferenceEndpoints.elasticsearch.endpointInfo.copyIdToClipboard',
  {
    defaultMessage: 'Copy endpoint ID to clipboard',
  }
);

export const COPY_ID_COPIED = i18n.translate(
  'xpack.searchInferenceEndpoints.elasticsearch.endpointInfo.copyIdCopied',
  {
    defaultMessage: 'Copied',
  }
);
