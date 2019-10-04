/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const MAP_TITLE = i18n.translate(
  'xpack.siem.components.embeddables.embeddedMap.embeddablePanelTitle',
  {
    defaultMessage: 'Source -> Destination Point-to-Point Map',
  }
);

export const ERROR_CONFIGURING_EMBEDDABLES_API = i18n.translate(
  'xpack.siem.components.embeddables.embeddedMap.errorConfiguringEmbeddableApiTitle',
  {
    defaultMessage: 'Error configuring Embeddables API',
  }
);

export const ERROR_CREATING_EMBEDDABLE = i18n.translate(
  'xpack.siem.components.embeddables.embeddedMap.errorCreatingMapEmbeddableTitle',
  {
    defaultMessage: 'Error creating Map Embeddable',
  }
);

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
      'An ECS compliant Kibana index pattern must be configured to view event data on the map. When using beats, you can run the following setup commands to create the required Kibana index patterns, otherwise you can configure them manually within Kibana settings.',
  }
);

export const ERROR_BUTTON = i18n.translate(
  'xpack.siem.components.embeddables.indexPatternsMissingPrompt.errorButtonLabel',
  {
    defaultMessage: 'Configure index patterns',
  }
);
