/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorContractUnion } from '@kbn/workflows';
import { getAllConnectors, getStepExposure } from '@kbn/workflows-management-plugin/common/schema';
import { z } from '@kbn/zod/v4';
import type { LookupDeps } from './lookup';
import { lookupStepDefinitions } from './lookup';

jest.mock('@kbn/workflows-management-plugin/common/schema', () => ({
  getAllConnectors: jest.fn(),
  getStepExposure: jest.fn(),
}));

const createStep = (type: string) =>
  ({
    type,
    summary: type,
    description: type,
    paramsSchema: z.object({}),
    outputSchema: z.object({}),
  } as unknown as ConnectorContractUnion);

const deps = {
  api: {
    getAvailableConnectors: jest.fn().mockResolvedValue({ connectorTypes: {}, totalConnectors: 0 }),
  },
  spaceId: 'default',
  request: {},
} as unknown as LookupDeps;

const getStepIds = (result: unknown): string[] =>
  ((result as { stepTypes?: Array<{ id: string }> }).stepTypes ?? []).map(({ id }) => id);

describe('lookupStepDefinitions', () => {
  beforeEach(() => {
    jest
      .mocked(getAllConnectors)
      .mockReturnValue([createStep('custom.internal'), createStep('custom.managedOnly')]);
    jest.mocked(getStepExposure).mockImplementation((stepType: string) => {
      if (stepType === 'custom.internal') return 'internal';
      if (stepType === 'custom.managedOnly') return 'managed_only';
      return 'open';
    });
  });

  it('keeps internal steps and excludes managed-only steps from search results', async () => {
    const result = await lookupStepDefinitions({ search: 'custom.' }, deps);

    expect(getStepIds(result)).toEqual(['custom.internal']);
  });

  it('does not return managed-only steps for exact stepType lookups', async () => {
    const result = await lookupStepDefinitions({ stepType: 'custom.managedOnly' }, deps);

    expect(result).toEqual({ error: 'No step type matching custom.managedOnly' });
  });
});
