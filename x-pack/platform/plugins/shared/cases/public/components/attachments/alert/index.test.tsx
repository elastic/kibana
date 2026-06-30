/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStackAlertAttachmentType } from '.';
import { STACK_ALERT_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { StackAlertAttachmentPayloadSchema } from '../../../../common/types/domain_zod/attachment/alert/v2';

describe('getStackAlertAttachmentType', () => {
  const registration = getStackAlertAttachmentType();

  it('registers with the correct id', () => {
    expect(registration.id).toBe(STACK_ALERT_ATTACHMENT_TYPE);
  });

  it('registers the zod payload schema', () => {
    expect(registration.schema).toBe(StackAlertAttachmentPayloadSchema);
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
