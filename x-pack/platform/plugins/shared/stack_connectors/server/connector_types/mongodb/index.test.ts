/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidatorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type { ValidatorServices } from '@kbn/actions-plugin/server/types';
import { getMongoConnectorType } from '.';
import { CONNECTOR_ID, CONNECTOR_NAME, SUB_ACTION } from './schemas';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

describe('MongoDB connector type', () => {
  it('exposes connector with id and name', () => {
    const connectorType = getMongoConnectorType();
    expect(connectorType.id).toBe(CONNECTOR_ID);
    expect(connectorType.name).toBe(CONNECTOR_NAME);
  });

  it('returns enterprise minimum license', () => {
    const connectorType = getMongoConnectorType();
    expect(connectorType.minimumLicenseRequired).toBe('enterprise');
  });

  it('includes WorkflowsConnectorFeatureId in supportedFeatureIds', () => {
    const connectorType = getMongoConnectorType();
    expect(connectorType.supportedFeatureIds).toContain('workflows');
  });

  it('getService returns a MongoConnector instance with all sub-actions', () => {
    const connectorType = getMongoConnectorType();
    const service = connectorType.getService({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: 'test-id', type: CONNECTOR_ID },
      config: { database: 'testdb' },
      secrets: { connectionUri: 'mongodb://localhost:27017' },
      logger: loggingSystemMock.createLogger(),
      services: actionsMock.createServices(),
    });

    const subActions = service.getSubActions();
    expect(subActions.size).toBe(4);
    expect(subActions.has(SUB_ACTION.TEST)).toBe(true);
    expect(subActions.has(SUB_ACTION.LIST_COLLECTIONS)).toBe(true);
    expect(subActions.has(SUB_ACTION.FIND)).toBe(true);
    expect(subActions.has(SUB_ACTION.AGGREGATE)).toBe(true);
  });

  it('validators throw when secrets lack connectionUri', () => {
    const connectorType = getMongoConnectorType();
    const secretsValidator = connectorType.validators?.find(
      (v) => v.type === ValidatorType.SECRETS
    );
    expect(secretsValidator).toBeDefined();
    const validatorServices = { configurationUtilities: actionsConfigMock.create() };
    expect(() =>
      (secretsValidator as { validator: (s: unknown, vs: ValidatorServices) => void }).validator(
        {},
        validatorServices
      )
    ).toThrow('MongoDB connection URI is required');
  });

  it('validators accept valid secrets', () => {
    const connectorType = getMongoConnectorType();
    const secretsValidator = connectorType.validators?.find(
      (v) => v.type === ValidatorType.SECRETS
    );
    expect(secretsValidator).toBeDefined();
    const validatorServices = { configurationUtilities: actionsConfigMock.create() };
    expect(() =>
      (secretsValidator as { validator: (s: unknown, vs: ValidatorServices) => void }).validator(
        { connectionUri: 'mongodb://localhost:27017' },
        validatorServices
      )
    ).not.toThrow();
  });
});
