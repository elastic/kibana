/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import type { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin-contracts';
import type { IElasticModels } from '@kbn/ml-trained-models-utils';

import type { AnomalySwimLane } from './shared_components';

const createElasticModelsMock = (): jest.Mocked<IElasticModels> => {
  return {
    getELSER: jest.fn().mockResolvedValue({
      version: 2,
      default: true,
      config: {
        input: {
          field_names: ['text_field'],
        },
      },
      description: 'Elastic Learned Sparse EncodeR v2 (Tech Preview)',
      model_id: '.elser_model_2',
    }),
  } as unknown as jest.Mocked<IElasticModels>;
};

const createSetupContract = (): jest.Mocked<MlPluginSetup> => {
  return {
    getLocator: jest.fn().mockResolvedValue(sharePluginMock.createLocator()),
    elasticModels: createElasticModelsMock(),
  };
};

const createStartContract = (): jest.Mocked<MlPluginStart> => {
  return {
    getLocator: jest.fn().mockResolvedValue(sharePluginMock.createLocator()),
    getMlApi: jest.fn(),
    elasticModels: createElasticModelsMock(),
    components: {
      AnomalySwimLane: jest.fn() as unknown as jest.Mocked<typeof AnomalySwimLane>,
    },
  };
};

export const mlPluginMock = {
  createSetupContract,
  createStartContract,
};
