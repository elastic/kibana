/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInMemoryRunQuotaRepository } from '../run_quotas/in_memory_repository.test_utils';
import {
  COST_TRACKING_AUDIT_SO_ID,
  COST_TRACKING_AUDIT_SO_TYPE,
  getCostTrackingAuditSavedObjectType,
  mutateCostTrackingAudit,
  readCostTrackingAudit,
  resolveFullTrackingCoverageStart,
} from './tracking_audit';

describe('cost tracking audit', () => {
  it('registers an unconditional hidden, agnostic, unindexed type', () => {
    const type = getCostTrackingAuditSavedObjectType();

    expect(type).toMatchObject({
      name: COST_TRACKING_AUDIT_SO_TYPE,
      hidden: true,
      namespaceType: 'agnostic',
      mappings: { dynamic: false, properties: {} },
      management: { importableAndExportable: false },
    });
    expect(type.modelVersions).toEqual(
      expect.objectContaining({
        '1': expect.objectContaining({ schemas: expect.any(Object) }),
      })
    );
  });

  it('creates and reads the singleton through the internal repository', async () => {
    const repository = createInMemoryRunQuotaRepository();
    expect(await readCostTrackingAudit(repository.client)).toBeUndefined();

    const attributes = await mutateCostTrackingAudit(repository.client, () => ({
      events: [
        {
          spaceId: 'default',
          enabled: true,
          changedAt: '2026-08-01T00:00:00.000Z',
          changedBy: 'operator',
        },
      ],
      knownSpaces: [{ id: 'default', name: 'Default' }],
    }));

    expect(attributes.knownSpaces).toEqual([{ id: 'default', name: 'Default' }]);
    expect(
      repository.getAttributes(COST_TRACKING_AUDIT_SO_TYPE, COST_TRACKING_AUDIT_SO_ID)
    ).toEqual(attributes);
    await expect(readCostTrackingAudit(repository.client)).resolves.toEqual(attributes);
  });

  it('uses the latest enable event in every current space as the full-coverage watermark', () => {
    expect(
      resolveFullTrackingCoverageStart({
        audit: {
          knownSpaces: [
            { id: 'default', name: 'Default' },
            { id: 'space-a', name: 'Space A' },
          ],
          events: [
            {
              spaceId: 'space-a',
              enabled: true,
              changedAt: '2026-08-03T00:00:00.000Z',
              changedBy: 'operator',
            },
            {
              spaceId: 'default',
              enabled: true,
              changedAt: '2026-08-01T00:00:00.000Z',
              changedBy: 'operator',
            },
          ],
        },
        currentSpaceIds: ['default', 'space-a'],
      })
    ).toBe('2026-08-03T00:00:00.000Z');
  });

  it('withholds the watermark after a disable or when a current space is absent from the audit', () => {
    const audit = {
      knownSpaces: [
        { id: 'default', name: 'Default' },
        { id: 'space-a', name: 'Space A' },
      ],
      events: [
        {
          spaceId: 'default',
          enabled: true,
          changedAt: '2026-08-01T00:00:00.000Z',
          changedBy: 'operator',
        },
        {
          spaceId: 'space-a',
          enabled: true,
          changedAt: '2026-08-01T00:00:00.000Z',
          changedBy: 'operator',
        },
        {
          spaceId: 'space-a',
          enabled: false,
          changedAt: '2026-08-15T00:00:00.000Z',
          changedBy: 'operator',
        },
      ],
    };

    expect(
      resolveFullTrackingCoverageStart({
        audit,
        currentSpaceIds: ['default', 'space-a'],
      })
    ).toBeUndefined();
    expect(
      resolveFullTrackingCoverageStart({
        audit,
        currentSpaceIds: ['default', 'space-a', 'space-b'],
      })
    ).toBeUndefined();
    expect(
      resolveFullTrackingCoverageStart({
        audit: undefined,
        currentSpaceIds: ['default'],
      })
    ).toBeUndefined();
  });
});
