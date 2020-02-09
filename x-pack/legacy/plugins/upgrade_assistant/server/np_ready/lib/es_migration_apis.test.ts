/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { getUpgradeAssistantStatus } from './es_migration_apis';

import { DeprecationAPIResponse } from 'src/legacy/core_plugins/elasticsearch';
import fakeDeprecations from './__fixtures__/fake_deprecations.json';

describe('getUpgradeAssistantStatus', () => {
  let deprecationsResponse: DeprecationAPIResponse;

  const callWithRequest = jest.fn().mockImplementation(async (req, api, { path }) => {
    if (path === '/_migration/deprecations') {
      return deprecationsResponse;
    } else if (api === 'indices.getMapping') {
      return {};
    } else {
      throw new Error(`Unexpected API call: ${path}`);
    }
  });

  beforeEach(() => {
    deprecationsResponse = _.cloneDeep(fakeDeprecations);
  });

  it('calls /_migration/deprecations', async () => {
    await getUpgradeAssistantStatus(callWithRequest, {} as any, false);
    expect(callWithRequest).toHaveBeenCalledWith({}, 'transport.request', {
      path: '/_migration/deprecations',
      method: 'GET',
    });
  });

  it('returns the correct shape of data', async () => {
    const resp = await getUpgradeAssistantStatus(callWithRequest, {} as any, false);
    expect(resp).toMatchSnapshot();
  });

  it('returns readyForUpgrade === false when critical issues found', async () => {
    deprecationsResponse = {
      cluster_settings: [{ level: 'critical', message: 'Do count me', url: 'https://...' }],
      node_settings: [],
      ml_settings: [],
      index_settings: {},
    };

    await expect(
      getUpgradeAssistantStatus(callWithRequest, {} as any, false)
    ).resolves.toHaveProperty('readyForUpgrade', false);
  });

  it('returns readyForUpgrade === true when no critical issues found', async () => {
    deprecationsResponse = {
      cluster_settings: [{ level: 'warning', message: 'Do not count me', url: 'https://...' }],
      node_settings: [],
      ml_settings: [],
      index_settings: {},
    };

    await expect(
      getUpgradeAssistantStatus(callWithRequest, {} as any, false)
    ).resolves.toHaveProperty('readyForUpgrade', true);
  });

  it('filters out security realm deprecation on Cloud', async () => {
    deprecationsResponse = {
      cluster_settings: [
        {
          level: 'critical',
          message: 'Security realm settings structure changed',
          url: 'https://...',
        },
      ],
      node_settings: [],
      ml_settings: [],
      index_settings: {},
    };

    const result = await getUpgradeAssistantStatus(callWithRequest, {} as any, true);

    expect(result).toHaveProperty('readyForUpgrade', true);
    expect(result).toHaveProperty('cluster', []);
  });
});
