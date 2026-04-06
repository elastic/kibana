/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const ADD_CONNECTOR_BUTTON_LABEL = i18n.translate(
  'xpack.automaticImport.components.connectorSelector.addConnectorButtonLabel',
  {
    defaultMessage: 'Add connector',
  }
);

export const ADD_CONNECTOR_NO_PERMISSION_TOOLTIP = i18n.translate(
  'xpack.automaticImport.components.connectorSelector.addConnectorNoPermissionTooltip',
  {
    defaultMessage:
      'You do not have permission to create connectors. Ask your administrator to grant Management > Connectors access.',
  }
);
export const SELECT_CONNECTOR_PLACEHOLDER = i18n.translate(
  'xpack.automaticImport.components.connectorSelector.selectConnectorPlaceholder',
  {
    defaultMessage: 'Select a connector',
  }
);

export const CREATE_AI_CONNECTOR_TITLE = i18n.translate(
  'xpack.automaticImport.components.connectorSetup.createAiConnectorTitle',
  {
    defaultMessage: 'Create AI Connector',
  }
);

export const SELECT_CONNECTOR_TYPE_DESCRIPTION = i18n.translate(
  'xpack.automaticImport.components.connectorSetup.selectConnectorTypeDescription',
  {
    defaultMessage: 'Select a connector type to get started',
  }
);

export const NO_CONNECTOR_TYPES_AVAILABLE = i18n.translate(
  'xpack.automaticImport.components.connectorSetup.noConnectorTypesAvailable',
  {
    defaultMessage: 'No AI connector types available',
  }
);
