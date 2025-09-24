/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clone } from 'lodash';
import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { packagePolicyService } from '../package_policy';

import type { PackagePolicy } from '../../types';

import {
  packagePolicyHasFrozenVariablesUpdate,
  updateFrozenInputs,
} from './package_policy_frozen_variables';

jest.mock('../package_policy');

const basePolicy: PackagePolicy = {
  id: '1',
  name: 'test',
  namespace: 'default',
  policy_ids: ['policy1'],
  enabled: true,
  inputs: [
    {
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: { dataset: 'test1', type: 'logs' },
          id: 'stream1',
          vars: { streamVar1: { type: 'text', value: 'old_value' } },
        },
      ],
      type: 'logfile',
      vars: { var1: { type: 'text', value: 'old_value', frozen: true } },
    },
  ],
  created_at: '2020-01-01T00:00:00Z',
  created_by: 'user',
  updated_at: '2020-01-01T00:00:00Z',
  updated_by: 'user',
  revision: 1,
  package: { name: 'test_package', title: 'test', version: '1.0.0' },
};

describe('packagePolicyHasFrozenVariablesUpdate', () => {
  it('should return true if a frozen variable value is different', () => {
    const hasUpdate = packagePolicyHasFrozenVariablesUpdate(basePolicy, [
      {
        type: 'logfile',
        enabled: true,
        vars: [{ name: 'var1', type: 'text', frozen: true, value: 'new_value' }],
      },
    ]);
    expect(hasUpdate).toBe(true);
  });

  it('should return false if no frozen variable value is different', () => {
    const hasUpdate = packagePolicyHasFrozenVariablesUpdate(basePolicy, [
      {
        type: 'logfile',
        enabled: true,
        vars: [{ name: 'var1', type: 'text', frozen: true, value: 'old_value' }],
      },
    ]);
    expect(hasUpdate).toBe(false);
  });
});

describe('updateFrozenInputs', () => {
  beforeEach(() => {
    jest.mocked(packagePolicyService.update).mockReset();
  });
  it('should update only frozen variables', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const soClient = savedObjectsClientMock.create();
    await updateFrozenInputs(esClient, soClient, clone(basePolicy), [
      {
        type: 'logfile',
        enabled: true,
        vars: [
          { name: 'var1', type: 'text', frozen: true, value: 'new_value' },
          { name: 'var2', type: 'text', value: 'new_value' },
        ],
      },
    ]);

    expect(packagePolicyService.update).toHaveBeenCalledTimes(1);
    expect(packagePolicyService.update).toHaveBeenCalledWith(
      soClient,
      esClient,
      '1',
      expect.objectContaining({
        inputs: [
          expect.objectContaining({
            vars: { var1: { type: 'text', value: 'new_value', frozen: true } },
          }),
        ],
      }),
      expect.objectContaining({ force: true, bumpRevision: false })
    );
  });

  it('should update variables that are newly frozen', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const soClient = savedObjectsClientMock.create();
    await updateFrozenInputs(esClient, soClient, clone(basePolicy), [
      {
        type: 'logfile',
        enabled: true,
        vars: [
          { name: 'var1', type: 'text', frozen: true, value: 'old_value' },
          { name: 'var2', type: 'text', value: 'new_value' },
        ],
        streams: [
          {
            data_stream: { dataset: 'test1', type: 'logs' },
            enabled: true,
            vars: [
              { name: 'streamVar1', type: 'text', frozen: true, value: 'old_value' },
              { name: 'streamVar2', type: 'text', value: 'new_value' },
            ],
          },
        ],
      },
    ]);

    expect(packagePolicyService.update).toHaveBeenCalledTimes(1);
    expect(packagePolicyService.update).toHaveBeenCalledWith(
      soClient,
      esClient,
      '1',
      expect.objectContaining({
        inputs: [
          expect.objectContaining({
            vars: { var1: { type: 'text', value: 'old_value', frozen: true } },
            streams: [
              expect.objectContaining({
                vars: { streamVar1: { type: 'text', value: 'old_value', frozen: true } },
              }),
            ],
          }),
        ],
      }),
      expect.objectContaining({ force: true, bumpRevision: false })
    );
  });
});
