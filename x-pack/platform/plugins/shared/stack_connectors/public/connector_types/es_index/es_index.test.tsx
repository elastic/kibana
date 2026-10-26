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
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';

const CONNECTOR_TYPE_ID = '.index';
let connectorTypeModel: ConnectorTypeModel;

beforeAll(() => {
  const connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  ExperimentalFeaturesService.init({ experimentalFeatures: experimentalFeaturesMock });
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
  const getResult = connectorTypeRegistry.get(CONNECTOR_TYPE_ID);
  if (getResult !== null) {
    connectorTypeModel = getResult;
  }
});

describe('connectorTypeRegistry.get() works', () => {
  test('connector type .index is registered', () => {
    expect(connectorTypeModel.id).toEqual(CONNECTOR_TYPE_ID);
    expect(connectorTypeModel.iconClass).toEqual('indexOpen');
  });
});

describe('action params validation', () => {
  test('action params validation succeeds when action params are valid', async () => {
    expect(
      await connectorTypeModel.validateParams(
        {
          documents: [{ test: 1234 }],
        },
        null
      )
    ).toEqual({
      errors: {
        documents: [],
        indexOverride: [],
      },
    });

    expect(
      await connectorTypeModel.validateParams(
        {
          documents: [{ test: 1234 }],
          indexOverride: 'kibana-alert-history-anything',
        },
        null
      )
    ).toEqual({
      errors: {
        documents: [],
        indexOverride: [],
      },
    });
  });

  test('action params validation fails when action params are invalid', async () => {
    expect(await connectorTypeModel.validateParams({}, null)).toEqual({
      errors: {
        documents: ['Document is required and should be a valid JSON object.'],
        indexOverride: [],
      },
    });

    expect(
      await connectorTypeModel.validateParams(
        {
          documents: [{}],
        },
        null
      )
    ).toEqual({
      errors: {
        documents: ['Document is required and should be a valid JSON object.'],
        indexOverride: [],
      },
    });

    expect(
      await connectorTypeModel.validateParams(
        {
          documents: [{}],
          indexOverride: 'kibana-alert-history-',
        },
        null
      )
    ).toEqual({
      errors: {
        documents: ['Document is required and should be a valid JSON object.'],
        indexOverride: ['Alert history index must contain valid suffix.'],
      },
    });

    expect(
      await connectorTypeModel.validateParams(
        {
          documents: [{}],
          indexOverride: 'this.is-a_string',
        },
        null
      )
    ).toEqual({
      errors: {
        documents: ['Document is required and should be a valid JSON object.'],
        indexOverride: ['Alert history index must begin with "kibana-alert-history-".'],
      },
    });
  });
});
