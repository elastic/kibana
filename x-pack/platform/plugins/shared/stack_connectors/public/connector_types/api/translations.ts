/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BASE_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.api.baseUrlTextFieldLabel',
  { defaultMessage: 'Base URL' }
);

export const BASE_URL_INVALID = i18n.translate(
  'xpack.stackConnectors.components.api.error.invalidBaseUrlTextField',
  { defaultMessage: 'Base URL is invalid.' }
);

export const BASE_URL_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.api.error.requiredBaseUrlText',
  { defaultMessage: 'Base URL is required.' }
);

export const PATH_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.api.pathFieldLabel',
  { defaultMessage: 'Path' }
);

export const METHOD_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.api.methodFieldLabel',
  { defaultMessage: 'Method' }
);

export const BODY_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.api.bodyFieldLabel',
  { defaultMessage: 'Body' }
);

export const QUERY_PARAMS_TITLE = i18n.translate(
  'xpack.stackConnectors.components.api.queryParamsTitle',
  { defaultMessage: 'Query Parameters' }
);

export const HEADERS_TITLE = i18n.translate('xpack.stackConnectors.components.api.headersTitle', {
  defaultMessage: 'Headers',
});

export const TIMEOUT_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.api.timeoutFieldLabel',
  { defaultMessage: 'Timeout (seconds)' }
);
