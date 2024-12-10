/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { registerConnectorTypes } from '..';
import { experimentalFeaturesMock, registrationServicesMock } from '../../mocks';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';

const ACTION_TYPE_ID = '.torq';
let actionTypeModel: ActionTypeModel;

beforeAll(() => {
  const connectorTypeRegistry = new TypeRegistry<ActionTypeModel>();
  ExperimentalFeaturesService.init({ experimentalFeatures: experimentalFeaturesMock });
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
  const getResult = connectorTypeRegistry.get(ACTION_TYPE_ID);
  if (getResult !== null) {
    actionTypeModel = getResult;
  }
});

describe('actionTypeRegistry.get() works', () => {
  test('action type static data is as expected', () => {
    expect(actionTypeModel.id).toEqual(ACTION_TYPE_ID);
  });
});

describe('torq action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      body: '{"message": "{test}"}',
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: { body: [] },
    });
  });

  test('action params validation succeeds when action params is valid - mustache', async () => {
    const actionParams = {
      body: '{"message": {{number}}}',
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: { body: [] },
    });
  });

  test('params validation fails when body is empty', async () => {
    const actionParams = {
      body: '',
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        body: ['Body is required.'],
      },
    });
  });

  test('params validation fails when body is not a valid JSON', async () => {
    const actionParams = {
      body: 'some text',
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        body: ['Body must be a valid JSON.'],
      },
    });
  });
});
