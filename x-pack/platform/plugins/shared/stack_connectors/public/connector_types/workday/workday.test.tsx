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
import { CONNECTOR_ID, SUB_ACTION } from '@kbn/connector-schemas/workday';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';

let connectorTypeModel: ConnectorTypeModel;

beforeAll(() => {
  const connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  ExperimentalFeaturesService.init({ experimentalFeatures: experimentalFeaturesMock });
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
  const got = connectorTypeRegistry.get(CONNECTOR_ID);
  if (got !== null) {
    connectorTypeModel = got;
  }
});

describe('workday connector type registration', () => {
  it('is registered under .workday', () => {
    expect(connectorTypeModel.id).toEqual(CONNECTOR_ID);
  });
});

describe('workday validateParams', () => {
  it('accepts a valid getWorker payload', async () => {
    const errors = (await connectorTypeModel.validateParams(
      {
        subAction: SUB_ACTION.GET_WORKER,
        subActionParams: { workerId: 'abc' },
      },
      null
    )) as { errors: Record<string, string[]> };
    expect(errors.errors.subAction).toEqual([]);
    expect(errors.errors['subActionParams.workerId']).toEqual([]);
  });

  it('flags an empty workerId', async () => {
    const errors = (await connectorTypeModel.validateParams(
      {
        subAction: SUB_ACTION.GET_WORKER,
        subActionParams: { workerId: '' },
      },
      null
    )) as { errors: Record<string, string[]> };
    expect(errors.errors['subActionParams.workerId'].length).toBeGreaterThan(0);
  });

  it('accepts a valid searchWorkers payload', async () => {
    const errors = (await connectorTypeModel.validateParams(
      {
        subAction: SUB_ACTION.SEARCH_WORKERS,
        subActionParams: { search: 'jane' },
      },
      null
    )) as { errors: Record<string, string[]> };
    expect(errors.errors['subActionParams.search']).toEqual([]);
  });

  it('flags a too-short search query', async () => {
    const errors = (await connectorTypeModel.validateParams(
      {
        subAction: SUB_ACTION.SEARCH_WORKERS,
        subActionParams: { search: 'ja' },
      },
      null
    )) as { errors: Record<string, string[]> };
    expect(errors.errors['subActionParams.search'].length).toBeGreaterThan(0);
  });

  it('rejects an unknown subAction', async () => {
    const errors = (await connectorTypeModel.validateParams(
      { subAction: 'nope', subActionParams: {} } as never,
      null
    )) as { errors: Record<string, string[]> };
    expect(errors.errors.subAction.length).toBeGreaterThan(0);
  });
});
