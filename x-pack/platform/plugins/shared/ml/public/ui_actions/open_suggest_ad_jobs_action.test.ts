/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { MlCoreSetup } from '../plugin';
import { checkPermissionAsync } from '../application/capabilities/check_capabilities';
import { createSuggestADJobsAction } from './open_suggest_ad_jobs_action';

jest.mock('../application/capabilities/check_capabilities', () => ({
  checkPermissionAsync: jest.fn(),
}));

interface TestLicense {
  status: string;
  hasAtLeast: () => boolean;
}

const setup = ({
  canCreateJob = true,
  license = { status: 'active', hasAtLeast: () => true } as TestLicense,
  connectors = [{ id: 'connector' }] as unknown[] | Error,
} = {}) => {
  (checkPermissionAsync as jest.Mock).mockResolvedValue(canCreateJob);
  const http = {
    get: jest.fn(() =>
      connectors instanceof Error ? Promise.reject(connectors) : Promise.resolve({ connectors })
    ),
  };
  const getStartServices = jest
    .fn()
    .mockResolvedValue([
      { http },
      { licensing: { license$: of(license) } },
    ]) as unknown as MlCoreSetup['getStartServices'];
  return createSuggestADJobsAction(getStartServices);
};

const context = { indexPattern: 'logs-*' };

describe('createSuggestADJobsAction isCompatible', () => {
  it('is compatible with permission, an Enterprise license and a connector', async () => {
    expect(await setup().isCompatible!(context as never)).toBe(true);
  });

  it('is not compatible without an index pattern', async () => {
    expect(await setup().isCompatible!({ indexPattern: '' } as never)).toBe(false);
  });

  it('is not compatible without permission to create jobs', async () => {
    expect(await setup({ canCreateJob: false }).isCompatible!(context as never)).toBe(false);
  });

  it('is not compatible below an Enterprise license', async () => {
    const action = setup({ license: { status: 'active', hasAtLeast: () => false } });
    expect(await action.isCompatible!(context as never)).toBe(false);
  });

  it('is not compatible with an inactive license', async () => {
    const action = setup({ license: { status: 'expired', hasAtLeast: () => true } });
    expect(await action.isCompatible!(context as never)).toBe(false);
  });

  it('is not compatible without a connector', async () => {
    expect(await setup({ connectors: [] }).isCompatible!(context as never)).toBe(false);
  });

  it('is not compatible when the connectors request fails', async () => {
    const action = setup({ connectors: new Error('nope') });
    expect(await action.isCompatible!(context as never)).toBe(false);
  });
});
