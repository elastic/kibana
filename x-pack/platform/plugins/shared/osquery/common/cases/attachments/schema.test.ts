/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OSQUERY_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { OsqueryAttachmentPayloadSchema } from './schema';

describe('OsqueryAttachmentPayloadSchema', () => {
  const validPayload = {
    type: OSQUERY_ATTACHMENT_TYPE,
    owner: 'securitySolution',
    attachmentId: 'action-1',
    metadata: {
      agentIds: ['agent-1', 'agent-2'],
      queryId: 'query-1',
    },
  };

  it('accepts a minimal valid payload (no `actionId` in metadata)', () => {
    expect(OsqueryAttachmentPayloadSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts a payload with optional `scheduleId` and `executionCount`', () => {
    const result = OsqueryAttachmentPayloadSchema.safeParse({
      ...validPayload,
      metadata: {
        ...validPayload.metadata,
        scheduleId: 'schedule-1',
        executionCount: 3,
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a legacy payload that still carries `actionId` in metadata', () => {
    const result = OsqueryAttachmentPayloadSchema.safeParse({
      ...validPayload,
      metadata: { ...validPayload.metadata, actionId: 'action-1' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects when the top-level type is wrong', () => {
    const result = OsqueryAttachmentPayloadSchema.safeParse({
      ...validPayload,
      type: 'comment',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when `attachmentId` is missing', () => {
    const { attachmentId, ...rest } = validPayload;
    expect(OsqueryAttachmentPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects unknown top-level keys', () => {
    const result = OsqueryAttachmentPayloadSchema.safeParse({ ...validPayload, extra: 'nope' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown metadata keys', () => {
    const result = OsqueryAttachmentPayloadSchema.safeParse({
      ...validPayload,
      metadata: { ...validPayload.metadata, unknown: 'nope' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects when `queryId` is missing in metadata', () => {
    const result = OsqueryAttachmentPayloadSchema.safeParse({
      ...validPayload,
      metadata: { agentIds: ['a'] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects when `agentIds` is not an array of strings', () => {
    const result = OsqueryAttachmentPayloadSchema.safeParse({
      ...validPayload,
      metadata: { ...validPayload.metadata, agentIds: [1, 2] },
    });
    expect(result.success).toBe(false);
  });
});
