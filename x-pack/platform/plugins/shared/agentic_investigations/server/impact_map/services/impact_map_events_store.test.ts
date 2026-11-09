/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ImpactMapEvent } from '../../../common/impact_map/impact_map';
import {
  ImpactMapEventsStore,
  impactMapEventDocumentId,
  toImpactMapEventDocument,
} from './impact_map_events_store';

const event: ImpactMapEvent = {
  id: 'e1',
  kind: 'anomaly',
  title: 'Latency anomaly on checkout',
  at: '2026-11-07T16:58:00Z',
  entity_id: 'checkout',
};

describe('ImpactMapEventsStore', () => {
  it('writes one document per event, searchable by kind, time and entity', async () => {
    const bulk = jest.fn().mockResolvedValue({});
    const store = new ImpactMapEventsStore({ storage: { bulk }, logger: loggerMock.create() });

    await store.write({ spaceId: 'default', conversationId: 'conv-1', events: [event] });

    const [{ operations }] = bulk.mock.calls[0];
    expect(operations).toHaveLength(1);
    expect(operations[0].index._id).toBe(impactMapEventDocumentId('default', 'conv-1', 'e1'));
    expect(operations[0].index.document).toMatchObject({
      spaceId: 'default',
      conversationId: 'conv-1',
      eventId: 'e1',
      kind: 'anomaly',
      at: '2026-11-07T16:58:00Z',
      entityId: 'checkout',
      event,
    });
  });

  it('writes the same event to the same document, so a rewrite updates it', () => {
    expect(impactMapEventDocumentId('default', 'conv-1', 'e1')).toBe(
      impactMapEventDocumentId('default', 'conv-1', 'e1')
    );
    expect(impactMapEventDocumentId('default', 'conv-1', 'e1')).not.toBe(
      impactMapEventDocumentId('default', 'conv-2', 'e1')
    );
  });

  it('writes nothing when there are no events', async () => {
    const bulk = jest.fn();
    const store = new ImpactMapEventsStore({ storage: { bulk }, logger: loggerMock.create() });

    await store.write({ spaceId: 'default', conversationId: 'conv-1', events: [] });

    expect(bulk).not.toHaveBeenCalled();
  });

  it('logs a failed write instead of failing the investigation', async () => {
    const logger = loggerMock.create();
    const store = new ImpactMapEventsStore({
      storage: { bulk: jest.fn().mockRejectedValue(new Error('down')) },
      logger,
    });

    await expect(
      store.write({ spaceId: 'default', conversationId: 'conv-1', events: [event] })
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('keeps optional fields out of the document when the event has none', () => {
    const document = toImpactMapEventDocument({
      spaceId: 'default',
      conversationId: 'conv-1',
      event: { id: 'e2', kind: 'investigation', title: 'Finding', at: '2026-11-07T17:00:00Z' },
    });

    expect(document).not.toHaveProperty('entityId');
    expect(document).not.toHaveProperty('endsAt');
  });
});
