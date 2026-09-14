/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { AttachmentResolveContext } from '@kbn/agent-builder-server/attachments';
import type { VersionedAttachmentWithOrigin } from '@kbn/agent-builder-common/attachments';
import type { Investigation, ImpactedEntity } from '../../../common/investigations/investigation';
import { INVESTIGATION_ATTACHMENT_IDS } from '../../../common/investigations/constants';
import type { InvestigationsService } from '../services/investigations_service';
import { createImpactAttachmentType } from './impact_attachment_type';

const IMPACT_ATTACHMENT_ID = INVESTIGATION_ATTACHMENT_IDS.IMPACT;

const createResolveContext = (spaceId = 'default'): AttachmentResolveContext => ({
  spaceId,
  request: httpServerMock.createKibanaRequest(),
  savedObjectsClient: {} as unknown as AttachmentResolveContext['savedObjectsClient'],
});

const createMinimalInvestigation = (overrides: Partial<Investigation> = {}): Investigation => ({
  id: 'investigation-1',
  spaceId: 'default',
  solution: 'observability',
  subjectType: 'significant_event',
  subjectId: 'event-1',
  status: 'completed',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  impactedEntities: [],
  hypotheses: [],
  recommendations: [],
  blindSpots: [],
  ...overrides,
});

const createVersionedAttachment = (
  investigationId: string,
  originSnapshotAt: string
): VersionedAttachmentWithOrigin<
  typeof IMPACT_ATTACHMENT_ID,
  { impactedEntities: ImpactedEntity[] }
> => ({
  id: 'attachment-1',
  type: IMPACT_ATTACHMENT_ID,
  origin: investigationId,
  origin_snapshot_at: originSnapshotAt,
  current_version: 1,
  versions: [
    {
      version: 1,
      data: { impactedEntities: [] },
      created_at: '2026-01-01T00:00:00.000Z',
      content_hash: 'abc123',
    },
  ],
});

const createMockService = (record: Investigation | undefined): InvestigationsService =>
  ({ get: jest.fn().mockResolvedValue(record) } as unknown as InvestigationsService);

describe('createImpactAttachmentType', () => {
  it('resolve() returns { impactedEntities } from the investigation record', async () => {
    const entity: ImpactedEntity = {
      name: 'payment-service',
      nameText: 'payment-service',
      type: 'service',
    };
    const investigation = createMinimalInvestigation({
      impactedEntities: [entity],
    });
    const type = createImpactAttachmentType(() => createMockService(investigation));

    await expect(type.resolve?.('investigation-1', createResolveContext())).resolves.toEqual({
      impactedEntities: [entity],
    });
  });

  it('isStale() returns true when updatedAt on the record is newer than origin_snapshot_at on the attachment', async () => {
    const investigation = createMinimalInvestigation({
      updatedAt: '2026-01-01T01:00:00.000Z',
    });
    const attachment = createVersionedAttachment('investigation-1', '2026-01-01T00:00:00.000Z');
    const type = createImpactAttachmentType(() => createMockService(investigation));

    await expect(type.isStale?.(attachment, createResolveContext())).resolves.toBe(true);
  });

  it('isStale() returns false when updatedAt equals origin_snapshot_at on the attachment', async () => {
    const investigation = createMinimalInvestigation({
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const attachment = createVersionedAttachment('investigation-1', '2026-01-01T00:00:00.000Z');
    const type = createImpactAttachmentType(() => createMockService(investigation));

    await expect(type.isStale?.(attachment, createResolveContext())).resolves.toBe(false);
  });
});
