/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE } from '../../../../constants/attachments';
import {
  IncidentTimelineEntryPayloadSchema,
  MAX_INCIDENT_TIMELINE_ENTRY_CONTENT_LENGTH,
  MAX_INCIDENT_TIMELINE_ENTRY_TITLE_LENGTH,
} from './v2';

describe('IncidentTimelineEntryPayloadSchema', () => {
  const validPayload = {
    type: INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE,
    owner: 'securitySolution',
    data: {
      title: 'Host wiped and returned to service',
      occurredAt: '2026-09-03T19:07:00.000Z',
    },
  };

  const parse = (data: Record<string, unknown>) =>
    IncidentTimelineEntryPayloadSchema.safeParse({ ...validPayload, data });

  it('accepts a point entry', () => {
    expect(IncidentTimelineEntryPayloadSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts a range entry with every optional field', () => {
    const result = parse({
      title: 'Response channel active',
      content: 'Rootly channel open',
      occurredAt: '2026-09-01T09:41:00Z',
      endAt: '2026-09-03T19:07:00Z',
      category: 'info',
      alert: { id: 'alert-1', index: '.alerts-security.alerts-default' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts endAt equal to occurredAt', () => {
    expect(parse({ ...validPayload.data, endAt: validPayload.data.occurredAt }).success).toBe(true);
  });

  it('rejects endAt before occurredAt', () => {
    const result = parse({ ...validPayload.data, endAt: '2026-09-03T19:06:59.999Z' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['data', 'endAt']);
  });

  it('rejects a time that is not an ISO 8601 UTC date time', () => {
    expect(parse({ ...validPayload.data, occurredAt: 'yesterday' }).success).toBe(false);
    expect(parse({ ...validPayload.data, occurredAt: '2026-09-03' }).success).toBe(false);
    expect(parse({ ...validPayload.data, occurredAt: '2026-09-03T19:07:00+02:00' }).success).toBe(
      false
    );
  });

  it('bounds the title', () => {
    const title = 'a'.repeat(MAX_INCIDENT_TIMELINE_ENTRY_TITLE_LENGTH);
    expect(parse({ ...validPayload.data, title }).success).toBe(true);
    expect(parse({ ...validPayload.data, title: `${title}a` }).success).toBe(false);
    expect(parse({ ...validPayload.data, title: '   ' }).success).toBe(false);
  });

  it('bounds the content', () => {
    const content = 'a'.repeat(MAX_INCIDENT_TIMELINE_ENTRY_CONTENT_LENGTH);
    expect(parse({ ...validPayload.data, content }).success).toBe(true);
    expect(parse({ ...validPayload.data, content: `${content}a` }).success).toBe(false);
  });

  it('bounds the linked alert id and index', () => {
    const alert = { id: 'a'.repeat(512), index: 'i'.repeat(1024) };
    expect(parse({ ...validPayload.data, alert }).success).toBe(true);
    expect(parse({ ...validPayload.data, alert: { ...alert, id: `${alert.id}a` } }).success).toBe(
      false
    );
    expect(
      parse({ ...validPayload.data, alert: { ...alert, index: `${alert.index}i` } }).success
    ).toBe(false);
  });

  it('rejects an unknown category', () => {
    expect(parse({ ...validPayload.data, category: 'elastic' }).success).toBe(false);
  });

  it('rejects unknown keys in the payload, the data and the alert link', () => {
    expect(
      IncidentTimelineEntryPayloadSchema.safeParse({ ...validPayload, metadata: {} }).success
    ).toBe(false);
    expect(parse({ ...validPayload.data, severity: 'high' }).success).toBe(false);
    expect(parse({ ...validPayload.data, alert: { id: 'a', index: 'i', rule: 'r' } }).success).toBe(
      false
    );
  });

  it('rejects an owner longer than 160 characters', () => {
    expect(
      IncidentTimelineEntryPayloadSchema.safeParse({ ...validPayload, owner: 'o'.repeat(161) })
        .success
    ).toBe(false);
  });
});
