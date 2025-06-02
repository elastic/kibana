/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { registerConnectorTypes } from '..';
import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { experimentalFeaturesMock, registrationServicesMock } from '../../mocks';
import { SUB_ACTION } from '../../../common/inference/constants';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';

const ACTION_TYPE_ID = '.inference';
let actionTypeModel: ActionTypeModel;

beforeAll(() => {
  ExperimentalFeaturesService.init({
    experimentalFeatures: { ...experimentalFeaturesMock } as any,
  });
  const connectorTypeRegistry = new TypeRegistry<ActionTypeModel>();
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
  const getResult = connectorTypeRegistry.get(ACTION_TYPE_ID);
  if (getResult !== null) {
    actionTypeModel = getResult;
  }
});

describe('actionTypeRegistry.get() works', () => {
  test('connector type static data is as expected', () => {
    expect(actionTypeModel.id).toEqual(ACTION_TYPE_ID);
    expect(actionTypeModel.selectMessage).toBe(
      'Send requests to AI providers such as Amazon Bedrock, OpenAI and more.'
    );
    expect(actionTypeModel.actionTypeTitle).toBe('AI Connector');
  });
});

describe('OpenAI action params validation', () => {
  test.each([
    {
      subAction: SUB_ACTION.RERANK,
      subActionParams: { input: ['message test'], query: 'foobar' },
    },
    {
      subAction: SUB_ACTION.UNIFIED_COMPLETION,
      subActionParams: { body: { messages: [{ role: 'user', content: 'What is Elastic?' }] } },
    },
    {
      subAction: SUB_ACTION.UNIFIED_COMPLETION_STREAM,
      subActionParams: { body: { messages: [{ role: 'user', content: 'What is Elastic?' }] } },
    },
    {
      subAction: SUB_ACTION.UNIFIED_COMPLETION_ASYNC_ITERATOR,
      subActionParams: { body: { messages: [{ role: 'user', content: 'What is Elastic?' }] } },
    },
    {
      subAction: SUB_ACTION.TEXT_EMBEDDING,
      subActionParams: { input: 'message test', inputType: 'foobar' },
    },
    {
      subAction: SUB_ACTION.SPARSE_EMBEDDING,
      subActionParams: { input: 'message test' },
    },
    {
      subAction: SUB_ACTION.COMPLETION,
      subActionParams: { input: 'message test' },
    },
  ])(
    'validation succeeds when params are valid for subAction $subAction',
    async ({ subAction, subActionParams }) => {
      const actionParams = {
        subAction,
        subActionParams,
      };
      expect(await actionTypeModel.validateParams(actionParams)).toEqual({
        errors: { body: [], input: [], subAction: [], inputType: [], query: [] },
      });
    }
  );

  test('params validation fails when params is a wrong object', async () => {
    const actionParams = {
      subAction: SUB_ACTION.UNIFIED_COMPLETION,
      subActionParams: { body: 'message {test}' },
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        body: ['Messages is required.'],
        inputType: [],
        query: [],
        subAction: [],
        input: [],
      },
    });
  });

  test('params validation fails when subAction is missing', async () => {
    const actionParams = {
      subActionParams: { input: 'message test' },
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        body: [],
        input: [],
        inputType: [],
        query: [],
        subAction: ['Action is required.'],
      },
    });
  });

  test('params validation fails when subAction is not in the list of the supported', async () => {
    const actionParams = {
      subAction: 'wrong',
      subActionParams: { input: 'message test' },
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        body: [],
        input: [],
        inputType: [],
        query: [],
        subAction: ['Invalid action name.'],
      },
    });
  });

  test('params validation fails when subActionParams is missing', async () => {
    const actionParams = {
      subAction: SUB_ACTION.RERANK,
      subActionParams: {},
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        body: [],
        input: ['Input is required.', 'Input does not have a valid Array format.'],
        inputType: [],
        query: ['Query is required.'],
        subAction: [],
      },
    });
  });

  test('params validation fails when text_embedding inputType is missing', async () => {
    const actionParams = {
      subAction: SUB_ACTION.TEXT_EMBEDDING,
      subActionParams: { input: 'message test' },
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        body: [],
        input: [],
        inputType: ['Input type is required.'],
        query: [],
        subAction: [],
      },
    });
  });
});
