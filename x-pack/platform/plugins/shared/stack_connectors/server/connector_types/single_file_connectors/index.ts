/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-nocheck

export { newSlackConnectorSchema } from './test_connector_1';
export { anotherConnectorSchema } from './test_connector_2';

export const mapToConnectorRegistration = (connector) => ({
  id: connector.id,
  name: connector.displayName,
  minimumLicenseRequired: 'gold',
  supportedFeatureIds: ['alerting'],
  uiFields: {
    iconClass: connector.icon,
    selectMessage: connector.description,
    actionTypeTitle: connector.displayName,
  },
  validate: {
    config: {
      schema: connector.configSchema,
    },
    secrets: {
      schema: connector.authSchema,
    },
  },
  actions: connector.actions,
  test: connector.test,
});
