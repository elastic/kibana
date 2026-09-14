/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { AttachmentResolveContext } from '@kbn/agent-builder-server/attachments';
import type { VersionedAttachmentWithOrigin } from '@kbn/agent-builder-common/attachments';
import type { InvestigationImpactEntity } from '@kbn/significant-events-schema';
import { INVESTIGATION_ATTACHMENT_IDS } from '../../../common/investigations/constants';
import type { NsiGetInvestigationResult, NsiInvestigationsClientLike } from '../nsi_client';
import { createImpactAttachmentType } from './impact_attachment_type';

const IMPACT_ATTACHMENT_ID = INVESTIGATION_ATTACHMENT_IDS.IMPACT;

const createResolveContext = (spaceId = 'default'): AttachmentResolveContext => ({
  spaceId,
  request: httpServerMock.createKibanaRequest(),
  savedObjectsClient: {} as unknown as AttachmentResolveContext['savedObjectsClient'],
});

const createMinimalResult = (
  overrides: Partial<NsiGetInvestigationResult> = {}
): NsiGetInvestigationResult => ({
  hypotheses: [],
  recommendations: [],
  blind_spots: [],
  impact: { entities: [] },
  ...overrides,
});

const createVersionedAttachment = (
  investigationId: string,
  originSnapshotAt: string
): VersionedAttachmentWithOrigin<
  typeof IMPACT_ATTACHMENT_ID,
  { entities: InvestigationImpactEntity[] }
> => ({
  id: 'attachment-1',
  type: IMPACT_ATTACHMENT_ID,
  origin: investigationId,
  origin_snapshot_at: originSnapshotAt,
  current_version: 1,
  versions: [
    {
      version: 1,
      data: { entities: [] },
      created_at: '2026-01-01T00:00:00.000Z',
      content_hash: 'abc123',
    },
  ],
});

const createMockClient = (result: NsiGetInvestigationResult): NsiInvestigationsClientLike => ({
  get: jest.fn().mockResolvedValue(result),
});

describe('createImpactAttachmentType', () => {
  it('resolve() returns { entities } from the investigation impact', async () => {
    const entity: InvestigationImpactEntity = { name: 'payment-service', type: 'service' };
    const result = createMinimalResult({ impact: { entities: [entity] } });
    const client = createMockClient(result);
    const type = createImpactAttachmentType(() => client);

    await expect(type.resolve?.('investigation-1', createResolveContext())).resolves.toEqual({
      entities: [entity],
    });
  });

  it('isStale() returns true when completed_at on the result is newer than origin_snapshot_at', async () => {
    const result = createMinimalResult({ completed_at: '2026-01-01T01:00:00.000Z' });
    const attachment = createVersionedAttachment('investigation-1', '2026-01-01T00:00:00.000Z');
    const type = createImpactAttachmentType(() => createMockClient(result));

    await expect(type.isStale?.(attachment, createResolveContext())).resolves.toBe(true);
  });

  it('isStale() returns false when investigation is still running (no completed_at)', async () => {
    const result = createMinimalResult({ completed_at: undefined });
    const attachment = createVersionedAttachment('investigation-1', '2026-01-01T00:00:00.000Z');
    const type = createImpactAttachmentType(() => createMockClient(result));

    await expect(type.isStale?.(attachment, createResolveContext())).resolves.toBe(false);
  });

  it('isStale() returns false when completed_at equals origin_snapshot_at', async () => {
    const result = createMinimalResult({ completed_at: '2026-01-01T00:00:00.000Z' });
    const attachment = createVersionedAttachment('investigation-1', '2026-01-01T00:00:00.000Z');
    const type = createImpactAttachmentType(() => createMockClient(result));

    await expect(type.isStale?.(attachment, createResolveContext())).resolves.toBe(false);
  });
});
