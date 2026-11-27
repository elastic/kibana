/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { stringify } from 'yaml';

import type { AssetsMap } from '../../../../common/types';

import type { RegistryDataStream } from '../../../../common';

import {
  logFailedPackagePolicyUpgrades,
  MAX_LOGGED_FAILED_POLICY_UPGRADES,
  MAX_LOGGED_UPGRADE_ERROR_LENGTH,
  resolveDataStreamFields,
} from './utils';

describe('logFailedPackagePolicyUpgrades', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    logger.warn.mockClear();
  });

  it('logs nothing when every package policy upgraded', () => {
    logFailedPackagePolicyUpgrades(logger, 'nginx', [
      { id: 'policy-1', success: true },
      { id: 'policy-2', success: true },
    ]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs nothing when there was nothing to upgrade', () => {
    logFailedPackagePolicyUpgrades(logger, 'nginx', undefined);
    logFailedPackagePolicyUpgrades(logger, 'nginx', []);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('names the first failed policies only, and counts the rest', () => {
    const total = MAX_LOGGED_FAILED_POLICY_UPGRADES + 5;
    const results = Array.from({ length: total }, (_, i) => ({
      id: `policy-${i + 1}`,
      success: false,
      statusCode: 400,
      body: { message: 'Invalid input' },
    }));

    logFailedPackagePolicyUpgrades(logger, 'nginx', [{ id: 'ok', success: true }, ...results]);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    const message = logger.warn.mock.calls[0][0] as string;
    expect(message).toMatch(
      new RegExp(`^Failed to upgrade ${total} of ${total + 1} package policies of package nginx: `)
    );
    expect(message).toContain(`policy-${MAX_LOGGED_FAILED_POLICY_UPGRADES}: Invalid input`);
    expect(message).not.toContain(`policy-${MAX_LOGGED_FAILED_POLICY_UPGRADES + 1}:`);
    expect(message.endsWith(' …and 5 more')).toBe(true);
  });

  it('shortens a long error message', () => {
    const longMessage = 'x'.repeat(MAX_LOGGED_UPGRADE_ERROR_LENGTH + 50);

    logFailedPackagePolicyUpgrades(logger, 'nginx', [
      { id: 'policy-1', success: false, statusCode: 400, body: { message: longMessage } },
    ]);

    expect(logger.warn).toHaveBeenCalledWith(
      `Failed to upgrade 1 of 1 package policies of package nginx: policy-1: ${'x'.repeat(
        MAX_LOGGED_UPGRADE_ERROR_LENGTH
      )}…`
    );
  });
});

describe('resolveDataStreamFields', () => {
  const statusAssetYml = stringify([
    {
      name: 'apache.status',
      type: 'group',
      fields: [
        {
          name: 'total_accesses',
          type: 'long',
          description: 'Total number of access requests.\n',
          metric_type: 'counter',
        },
        {
          name: 'uptime',
          type: 'group',
          fields: [
            {
              name: 'server_uptime',
              type: 'long',
              description: 'Server uptime in seconds.\n',
              metric_type: 'counter',
            },
            {
              name: 'uptime',
              type: 'long',
              description: 'Server uptime.\n',
              metric_type: 'counter',
            },
          ],
        },
      ],
    },
  ]);

  const dataStream = {
    dataset: 'apache.status',
    path: 'status',
  } as RegistryDataStream;

  const assetsMap = new Map([
    ['apache-1.18.0/data_stream/status/fields/fields.yml', Buffer.from(statusAssetYml)],
  ]) as AssetsMap;

  const expectedResult = {
    'apache.status': {
      'apache.status.total_accesses': {
        name: 'total_accesses',
        type: 'long',
        description: 'Total number of access requests.\n',
        metric_type: 'counter',
        flat_name: 'apache.status.total_accesses',
      },
      'apache.status.uptime.server_uptime': {
        name: 'server_uptime',
        type: 'long',
        description: 'Server uptime in seconds.\n',
        metric_type: 'counter',
        flat_name: 'apache.status.uptime.server_uptime',
      },
      'apache.status.uptime.uptime': {
        name: 'uptime',
        type: 'long',
        description: 'Server uptime.\n',
        metric_type: 'counter',
        flat_name: 'apache.status.uptime.uptime',
      },
    },
  };

  it('should load and resolve fields for the passed data stream', () => {
    expect(resolveDataStreamFields({ dataStream, assetsMap })).toEqual(expectedResult);
  });
});
