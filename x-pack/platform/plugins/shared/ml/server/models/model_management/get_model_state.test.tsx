/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MODEL_STATE } from '@kbn/ml-trained-models-utils';
import type { NLPModelItem } from '../../../common/types/trained_models';
import { getModelDeploymentState } from './get_model_state';

describe('getModelDeploymentState', () => {
  it('returns STARTED if any deployment is in STARTED state', () => {
    const model = {
      stats: {
        model_id: '.elser_model_2',
        model_size_stats: {
          model_size_bytes: 438123914,
          required_native_memory_bytes: 2101346304,
        },

        deployment_stats: [
          {
            deployment_id: '.elser_model_2_01',
            model_id: '.elser_model_2',
            state: 'starting',
          },
          {
            deployment_id: '.elser_model_2',
            model_id: '.elser_model_2',
            state: 'started',
            allocation_status: {
              allocation_count: 1,
              target_allocation_count: 1,
              state: 'fully_allocated',
            },
          },
        ],
      },
    } as unknown as NLPModelItem;
    const result = getModelDeploymentState(model);
    expect(result).toEqual(MODEL_STATE.STARTED);
  });

  it('returns MODEL_STATE.STARTING if any deployment is in STARTING state', () => {
    const model = {
      stats: {
        model_id: '.elser_model_2',
        model_size_stats: {
          model_size_bytes: 438123914,
          required_native_memory_bytes: 2101346304,
        },

        deployment_stats: [
          {
            deployment_id: '.elser_model_2',
            model_id: '.elser_model_2',
            state: 'stopping',
          },
          {
            deployment_id: '.elser_model_2_01',
            model_id: '.elser_model_2',
            state: 'starting',
          },
          {
            deployment_id: '.elser_model_2',
            model_id: '.elser_model_2',
            state: 'stopping',
          },
        ],
      },
    } as unknown as NLPModelItem;
    const result = getModelDeploymentState(model);
    expect(result).toEqual(MODEL_STATE.STARTING);
  });

  it('returns MODEL_STATE.STOPPING if every deployment is in STOPPING state', () => {
    const model = {
      stats: {
        model_id: '.elser_model_2',
        model_size_stats: {
          model_size_bytes: 438123914,
          required_native_memory_bytes: 2101346304,
        },

        deployment_stats: [
          {
            deployment_id: '.elser_model_2',
            model_id: '.elser_model_2',
            state: 'stopping',
          },
          {
            deployment_id: '.elser_model_2_01',
            model_id: '.elser_model_2',
            state: 'stopping',
          },
        ],
      },
    } as unknown as NLPModelItem;
    const result = getModelDeploymentState(model);
    expect(result).toEqual(MODEL_STATE.STOPPING);
  });

  it('returns undefined for empty deployment stats', () => {
    const model = {
      stats: {
        model_id: '.elser_model_2',
        model_size_stats: {
          model_size_bytes: 438123914,
          required_native_memory_bytes: 2101346304,
        },

        deployment_stats: [],
      },
    } as unknown as NLPModelItem;
    const result = getModelDeploymentState(model);
    expect(result).toEqual(undefined);
  });
});
