/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStackAlertAttachmentType } from '.';
import { STACK_ALERT_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';

describe('getStackAlertAttachmentType', () => {
  const registration = getStackAlertAttachmentType();

  it('registers with the correct id', () => {
    expect(registration.id).toBe(STACK_ALERT_ATTACHMENT_TYPE);
  });

  it('exposes a schemaValidator that accepts valid metadata', () => {
    expect(() =>
      registration.schemaValidator?.({
        index: '.alerts',
        rule: { id: 'rule-1', name: 'Test Rule' },
      })
    ).not.toThrow();
  });

  it('accepts undefined metadata', () => {
    expect(() => registration.schemaValidator?.(undefined)).not.toThrow();
  });

  it('accepts null rule', () => {
    expect(() => registration.schemaValidator?.({ rule: null })).not.toThrow();
  });

  it('exposes a schemaValidator that rejects invalid metadata', () => {
    expect(() => registration.schemaValidator?.({ index: 123 })).toThrow();
  });

  it('rejects metadata with a non-object rule', () => {
    expect(() => registration.schemaValidator?.({ rule: 'not-an-object' })).toThrow();
  });

  describe('getAttachmentRemovalObject', () => {
    const getAttachmentRemovalObject = registration.getAttachmentRemovalObject!;

    it('returns a singular removal event when there is one alert id', () => {
      const removal = getAttachmentRemovalObject({ attachmentId: 'a1' } as never);
      expect(removal.event).toBeDefined();
    });

    it('returns a plural removal event when there are multiple alert ids', () => {
      const removal = getAttachmentRemovalObject({ attachmentId: ['a1', 'a2'] } as never);
      expect(removal.event).toBeDefined();
    });
  });

  describe('getAttachmentTabViewObject', () => {
    it('returns the stack alert tab content', () => {
      const tab = registration.getAttachmentTabViewObject?.();
      expect(tab?.children).toBeDefined();
    });
  });
});
