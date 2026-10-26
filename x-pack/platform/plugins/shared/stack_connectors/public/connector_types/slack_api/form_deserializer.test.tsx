/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { registerConnectorTypes } from '..';
import { experimentalFeaturesMock, registrationServicesMock } from '../../mocks';
import { CONNECTOR_ID } from '@kbn/connector-schemas/slack_api/constants';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';

let connectorTypeModel: ConnectorTypeModel;

beforeAll(async () => {
  const connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  ExperimentalFeaturesService.init({ experimentalFeatures: experimentalFeaturesMock });
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });

  const getResult = connectorTypeRegistry.get(CONNECTOR_ID);

  if (getResult !== null) {
    connectorTypeModel = getResult;
  }
});

describe('deserializer', () => {
  it('should deserialize the config as expected', () => {
    const data = {
      id: '1',
      name: 'slack api',
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: false,
      actionTypeId: CONNECTOR_ID,
      config: { allowedChannels: [{ name: 'general' }, { name: '#random' }] },
      secrets: {},
    };

    const deserializer = connectorTypeModel.connectorForm?.deserializer!;
    const result = deserializer(data);

    expect(result).toEqual({
      ...data,
      config: {
        ...data.config,
        allowedChannels: [{ name: '#general' }, { name: '#random' }],
      },
    });
  });
});
