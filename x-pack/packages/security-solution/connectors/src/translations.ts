/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOAD_CONNECTORS_ERROR_MESSAGE = i18n.translate(
  'securitySolutionPackages.connectors.useLoadConnectors.errorMessage',
  {
    defaultMessage: 'An error occurred loading the Kibana Connectors. ',
  }
);

export const PRECONFIGURED_CONNECTOR = i18n.translate(
  'securitySolutionPackages.connectors.preconfiguredTitle',
  {
    defaultMessage: 'Preconfigured',
  }
);

export const CONNECTOR_SELECTOR_TITLE = i18n.translate(
  'securitySolutionPackages.connectors.connectorSelector.ariaLabel',
  {
    defaultMessage: 'Connector Selector',
  }
);

export const ADD_NEW_CONNECTOR = i18n.translate(
  'securitySolutionPackages.connectors.connectorSelector.newConnectorOptions',
  {
    defaultMessage: 'Add new Connector...',
  }
);

export const ADD_CONNECTOR = i18n.translate(
  'securitySolutionPackages.connectors.connectorSelector.addConnectorButtonLabel',
  {
    defaultMessage: 'Add connector',
  }
);

export const CONNECTOR_SELECTOR_PLACEHOLDER = i18n.translate(
  'securitySolutionPackages.connectors.connectorSelectorInline.connectorPlaceholder',
  {
    defaultMessage: 'Select a connector',
  }
);
