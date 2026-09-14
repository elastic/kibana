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
import type { InvestigationsService, InvestigationRecord } from '../storage/investigations_service';
import { createImpactAttachmentType } from './impact_attachment_type';

const IMPACT_ATTACHMENT_ID = INVESTIGATION_ATTACHMENT_IDS.IMPACT;

const createResolveContext = (spaceId = 'default'): AttachmentResolveContext => ({
  spaceId,
  request: httpServerMock.createKibanaRequest(),
  savedObjectsClient: {} as unknown as AttachmentResolveContext['savedObjectsClient'],
});

const createMinimalRecord = (
  overrides: Partial<InvestigationRecord> = {}
): InvestigationRecord => ({
  id: 'investigation-1',
  spaceId: 'default',
  solution: 'nightshift',
  subjectType: 'alert',
  subjectId: 'alert-1',
  status: 'running',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  hypotheses: [],
  recommendations: [],
  blindSpots: [],
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

const createMockService = (record: InvestigationRecord | null): InvestigationsService => ({
  get: jest.fn().mockResolvedValue(record),
  upsert: jest.fn(),
  list: jest.fn(),
  getSeverityCounts: jest.fn(),
  findAcrossSpaces: jest.fn(),
  updateInSpace: jest.fn(),
});

describe('createImpactAttachmentType', () => {
  it('resolve() returns { entities } from the investigation impact', async () => {
    const entity: InvestigationImpactEntity = { name: 'payment-service', type: 'service' };
    const record = createMinimalRecord({ impact: { entities: [entity as Record<string, unknown>] } });
    const service = createMockService(record);
    const type = createImpactAttachmentType(service);

    await expect(type.resolve?.('investigation-1', createResolveContext())).resolves.toEqual({
      entities: [entity],
    });
  });

  it('isStale() returns true when completedAt on the record is newer than origin_snapshot_at', async () => {
    const record = createMinimalRecord({ completedAt: '2026-01-01T01:00:00.000Z' });
    const attachment = createVersionedAttachment('investigation-1', '2026-01-01T00:00:00.000Z');
    const type = createImpactAttachmentType(createMockService(record));

    await expect(type.isStale?.(attachment, createResolveContext())).resolves.toBe(true);
  });

  it('isStale() returns false when investigation is still running (no completedAt)', async () => {
    const record = createMinimalRecord({ completedAt: undefined });
    const attachment = createVersionedAttachment('investigation-1', '2026-01-01T00:00:00.000Z');
    const type = createImpactAttachmentType(createMockService(record));

    await expect(type.isStale?.(attachment, createResolveContext())).resolves.toBe(false);
  });

  it('isStale() returns false when completedAt equals origin_snapshot_at', async () => {
    const record = createMinimalRecord({ completedAt: '2026-01-01T00:00:00.000Z' });
    const attachment = createVersionedAttachment('investigation-1', '2026-01-01T00:00:00.000Z');
    const type = createImpactAttachmentType(createMockService(record));

    await expect(type.isStale?.(attachment, createResolveContext())).resolves.toBe(false);
  });
});
