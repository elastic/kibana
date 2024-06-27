/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CONNECTOR_SETTINGS_MANAGEMENT_TITLE = i18n.translate(
  'xpack.elasticAssistant.connectors.connectorSettingsManagement.title',
  {
    defaultMessage: 'Connector Settings',
  }
);

export const CONNECTOR_SETTINGS_MANAGEMENT_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.connectors.connectorSettingsManagement.description',
  {
    defaultMessage:
      'Using the Elastic AI Assistant requires setting up a connector with API access to OpenAI or Bedrock large language models. ',
  }
);

export const CONNECTOR_MANAGEMENT_BUTTON_TITLE = i18n.translate(
  'xpack.elasticAssistant.connectors.connectorSettingsManagement.buttonTitle',
  {
    defaultMessage: 'Manage Connectors',
  }
);
