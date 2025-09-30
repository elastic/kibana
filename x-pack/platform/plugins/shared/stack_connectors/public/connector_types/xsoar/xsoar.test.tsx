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
import { SUB_ACTION } from '../../../common/xsoar/constants';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';
import * as translations from './translations';

const CONNECTOR_TYPE_ID = '.xsoar';
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

describe('actionTypeRegistry.get() works', () => {
  test('action type static data is as expected', () => {
    expect(connectorTypeModel.id).toEqual(CONNECTOR_TYPE_ID);
  });
});

describe('XSOAR RUN action params validation', () => {
  test('RUN action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      subAction: SUB_ACTION.RUN,
      subActionParams: {
        name: 'new incident',
        playbookId: 'playbook0',
        createInvestigation: false,
        severity: 1,
        body: '',
      },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        name: [],
      },
    });
  });

  test('RUN action params validation fails when required fields is not valid', async () => {
    const actionParams = {
      subAction: SUB_ACTION.RUN,
      subActionParams: {
        name: '',
        playbookId: 'playbook0',
        createInvestigation: false,
        severity: 1,
        body: '',
      },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        name: [translations.NAME_REQUIRED],
      },
    });
  });
});
