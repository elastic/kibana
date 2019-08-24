/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_TITLE = i18n.translate(
  'xpack.siem.components.embeddables.indexPatternsMissingPrompt.errorTitle',
  {
    defaultMessage: 'Required Index Patterns Not Configured',
  }
);

export const ERROR_DESCRIPTION = i18n.translate(
  'xpack.siem.components.embeddables.indexPatternsMissingPrompt.errorDescription',
  {
    defaultMessage:
      'An ECS compliant Kibana Index Pattern must be configured to view event data on the map. Please configure one of the following index patterns specified in Kibana Advanced Settings (siem:defaultIndex) and refresh the page.',
  }
);

export const ERROR_BUTTON = i18n.translate(
  'xpack.siem.components.embeddables.indexPatternsMissingPrompt.errorButtonLabel',
  {
    defaultMessage: 'Configure Index Patterns',
  }
);
