/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const selectableAriaLabel = i18n.translate(
  'xpack.aiAssistant.connectorSelector.selectableAriaLabel',
  {
    defaultMessage: 'Select a connector',
  }
);

const addConnectorAriaLabel = i18n.translate(
  'xpack.aiAssistant.connectorSelector.addConnectorAriaLabel',
  {
    defaultMessage: 'Add Connector',
  }
);

const addConnectorLabel = i18n.translate('xpack.aiAssistant.connectorSelector.addConnectorLabel', {
  defaultMessage: 'Add Connector',
});

const manageConnectorAriaLabel = i18n.translate(
  'xpack.aiAssistant.connectorSelector.manageConnectorAriaLabel',
  {
    defaultMessage: 'Manage Connector',
  }
);

const preConfiguredConnectorLabel = i18n.translate(
  'xpack.aiAssistant.connectorSelector.preConfiguredConnectorLabel',
  {
    defaultMessage: 'Pre-configured',
  }
);

const customConnectorLabel = i18n.translate(
  'xpack.aiAssistant.connectorSelector.customConnectorLabel',
  {
    defaultMessage: 'Custom',
  }
);

const defaultConnectorLabel = i18n.translate(
  'xpack.aiAssistant.connectorSelector.defaultConnectorLabel',
  {
    defaultMessage: 'Default',
  }
);

/**
 * Translations for the `ConnectorSelector` component.
 */
export const translations = {
  selectableAriaLabel,
  addConnectorAriaLabel,
  addConnectorLabel,
  manageConnectorAriaLabel,
  preConfiguredConnectorLabel,
  customConnectorLabel,
  defaultConnectorLabel,
};
