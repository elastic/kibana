/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { registerConnectorTypes } from '..';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { experimentalFeaturesMock, registrationServicesMock } from '../../mocks';
import { TinesExecuteActionParams } from './types';
import { SUB_ACTION, TINES_CONNECTOR_ID, TINES_TITLE } from '../../../common/tines/constants';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';

let actionTypeModel: ConnectorTypeModel;

const webhook = {
  id: 1234,
  name: 'some webhook action',
  storyId: 5435,
  path: 'somePath',
  secret: 'someSecret',
};
const actionParams: TinesExecuteActionParams = {
  subAction: SUB_ACTION.RUN,
  subActionParams: { webhook },
};
const defaultValidationErrors = {
  subAction: [],
  story: [],
  webhook: [],
  webhookUrl: [],
  body: [],
};

beforeAll(() => {
  const connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  ExperimentalFeaturesService.init({ experimentalFeatures: experimentalFeaturesMock });
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
  const getResult = connectorTypeRegistry.get(TINES_CONNECTOR_ID);
  if (getResult !== null) {
    actionTypeModel = getResult;
  }
});

describe('actionTypeRegistry.get() works', () => {
  it('should get Tines action type static data', () => {
    expect(actionTypeModel.id).toEqual(TINES_CONNECTOR_ID);
    expect(actionTypeModel.actionTypeTitle).toEqual(TINES_TITLE);
  });
});

describe('tines action params validation', () => {
  it('should fail when storyId is missing', async () => {
    const validation = await actionTypeModel.validateParams({
      ...actionParams,
      subActionParams: { webhook: { ...webhook, storyId: undefined } },
    });
    expect(validation.errors).toEqual({
      ...defaultValidationErrors,
      story: ['Story is required.'],
    });
  });

  it('should fail when webhook is missing', async () => {
    const validation = await actionTypeModel.validateParams({
      ...actionParams,
      subActionParams: { webhook: { ...webhook, id: undefined } },
    });
    expect(validation.errors).toEqual({
      ...defaultValidationErrors,
      webhook: ['Webhook is required.'],
    });
  });

  it('should fail when webhook path is missing', async () => {
    const validation = await actionTypeModel.validateParams({
      ...actionParams,
      subActionParams: { webhook: { ...webhook, path: '' } },
    });
    expect(validation.errors).toEqual({
      ...defaultValidationErrors,
      webhook: ['Webhook action path is missing.'],
    });
  });

  it('should fail when webhook secret is missing', async () => {
    const validation = await actionTypeModel.validateParams({
      ...actionParams,
      subActionParams: { webhook: { ...webhook, secret: '' } },
    });
    expect(validation.errors).toEqual({
      ...defaultValidationErrors,
      webhook: ['Webhook action secret is missing.'],
    });
  });

  it('should succeed when webhook params are correct', async () => {
    const validation = await actionTypeModel.validateParams(actionParams);
    expect(validation.errors).toEqual(defaultValidationErrors);
  });

  it('should fail when webhookUrl is not a URL', async () => {
    const validation = await actionTypeModel.validateParams({
      ...actionParams,
      subActionParams: { ...actionParams.subActionParams, webhookUrl: 'foo' },
    });
    expect(validation.errors).toEqual({
      ...defaultValidationErrors,
      webhookUrl: ['Webhook URL is invalid.'],
    });
  });

  it('should fail when webhookUrl is not using https', async () => {
    const validation = await actionTypeModel.validateParams({
      ...actionParams,
      subActionParams: { ...actionParams.subActionParams, webhookUrl: 'http://example.tines.com' },
    });
    expect(validation.errors).toEqual({
      ...defaultValidationErrors,
      webhookUrl: ['Webhook URL does not have a valid "https" protocol.'],
    });
  });

  it('should succeed when webhookUrl is a proper Tines URL', async () => {
    const validation = await actionTypeModel.validateParams({
      ...actionParams,
      subActionParams: {
        ...actionParams.subActionParams,
        webhookUrl: 'https://example.tines.com/abc/1234',
      },
    });
    expect(validation.errors).toEqual({
      ...defaultValidationErrors,
    });
  });

  it('should fail when subAction is missing', async () => {
    const validation = await actionTypeModel.validateParams({
      ...actionParams,
      subAction: '',
    });
    expect(validation.errors).toEqual({
      ...defaultValidationErrors,
      subAction: ['Action is required.'],
    });
  });

  it('should fail when subAction is wrong', async () => {
    const validation = await actionTypeModel.validateParams({
      ...actionParams,
      subAction: 'stories',
    });
    expect(validation.errors).toEqual({
      ...defaultValidationErrors,
      subAction: ['Invalid action name.'],
    });
  });

  it('should fail when subAction is test and body is missing', async () => {
    const validation = await actionTypeModel.validateParams({
      ...actionParams,
      subAction: SUB_ACTION.TEST,
    });
    expect(validation.errors).toEqual({
      ...defaultValidationErrors,
      body: ['Body is required.'],
    });
  });

  it('should fail when subAction is test and body is not JSON format', async () => {
    const validation = await actionTypeModel.validateParams({
      subAction: SUB_ACTION.TEST,
      subActionParams: { webhook, body: 'not json' },
    });
    expect(validation.errors).toEqual({
      ...defaultValidationErrors,
      body: ['Body does not have a valid JSON format.'],
    });
  });

  it('should succeed when subAction is test and params are correct', async () => {
    const validation = await actionTypeModel.validateParams({
      subAction: SUB_ACTION.TEST,
      subActionParams: { webhook, body: '[]' },
    });
    expect(validation.errors).toEqual(defaultValidationErrors);
  });
});
