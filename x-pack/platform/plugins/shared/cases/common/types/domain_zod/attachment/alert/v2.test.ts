/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STACK_ALERT_ATTACHMENT_TYPE } from '../../../../constants/attachments';
import { StackAlertAttachmentPayloadSchema } from './v2';

describe('StackAlertAttachmentPayloadSchema', () => {
  const validPayload = {
    type: STACK_ALERT_ATTACHMENT_TYPE,
    owner: 'cases',
    attachmentId: 'alert-1',
    metadata: {
      index: '.alerts-stack',
      rule: { id: 'rule-1', name: 'Rule One' },
    },
  };

  it('accepts a valid stack alert payload', () => {
    expect(StackAlertAttachmentPayloadSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts an array attachmentId (multi-alert)', () => {
    expect(
      StackAlertAttachmentPayloadSchema.safeParse({
        ...validPayload,
        attachmentId: ['alert-1', 'alert-2'],
      }).success
    ).toBe(true);
  });

  it('accepts an array index (paired multi-alert)', () => {
    expect(
      StackAlertAttachmentPayloadSchema.safeParse({
        ...validPayload,
        attachmentId: ['alert-1', 'alert-2'],
        metadata: { ...validPayload.metadata, index: ['.alerts-stack', '.alerts-stack-2'] },
      }).success
    ).toBe(true);
  });

  it('accepts a missing metadata field', () => {
    const { metadata, ...rest } = validPayload;
    expect(StackAlertAttachmentPayloadSchema.safeParse(rest).success).toBe(true);
  });

  it('rejects null metadata', () => {
    expect(
      StackAlertAttachmentPayloadSchema.safeParse({ ...validPayload, metadata: null }).success
    ).toBe(false);
  });

  it('accepts a null rule', () => {
    expect(
      StackAlertAttachmentPayloadSchema.safeParse({
        ...validPayload,
        metadata: { ...validPayload.metadata, rule: null },
      }).success
    ).toBe(true);
  });

  it('rejects a wrong type literal', () => {
    expect(
      StackAlertAttachmentPayloadSchema.safeParse({ ...validPayload, type: 'security.alert' })
        .success
    ).toBe(false);
  });

  it('rejects a missing attachmentId', () => {
    const { attachmentId, ...rest } = validPayload;
    expect(StackAlertAttachmentPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a missing owner', () => {
    const { owner, ...rest } = validPayload;
    expect(StackAlertAttachmentPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects unknown top-level keys (strict)', () => {
    expect(
      StackAlertAttachmentPayloadSchema.safeParse({ ...validPayload, extra: 'nope' }).success
    ).toBe(false);
  });

  it('rejects unknown metadata keys (strict)', () => {
    expect(
      StackAlertAttachmentPayloadSchema.safeParse({
        ...validPayload,
        metadata: { ...validPayload.metadata, unknown: 'nope' },
      }).success
    ).toBe(false);
  });

  it('rejects a wrong metadata.index type', () => {
    expect(
      StackAlertAttachmentPayloadSchema.safeParse({
        ...validPayload,
        metadata: { index: 123 },
      }).success
    ).toBe(false);
  });
});
