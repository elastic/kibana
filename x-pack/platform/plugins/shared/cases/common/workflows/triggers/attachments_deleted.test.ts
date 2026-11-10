/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { SECURITY_ALERT_ATTACHMENT_TYPE, SECURITY_SOLUTION_OWNER } from '../../constants';
import { attachmentsDeletedTriggerCommonDefinition } from '.';

describe('attachmentsDeleted trigger', () => {
  const payload = {
    caseId: 'case-1',
    owner: SECURITY_SOLUTION_OWNER,
    ids: ['attachment-1'],
    attachmentIds: ['attachment-1'],
    attachmentType: SECURITY_ALERT_ATTACHMENT_TYPE,
    alertIds: ['alert-1'],
    alertIndices: ['.internal.alerts-security.alerts-default-000001'],
  };

  it('accepts the identifier-only payload', () => {
    expect(attachmentsDeletedTriggerCommonDefinition.eventSchema.safeParse(payload).success).toBe(
      true
    );
  });

  it('rejects attachment content and other unexpected fields', () => {
    expect(
      attachmentsDeletedTriggerCommonDefinition.eventSchema.safeParse({
        ...payload,
        comment: 'secret case data',
      }).success
    ).toBe(false);
  });

  it('marks attachmentIds as deprecated in favor of ids', () => {
    const { properties } = z.toJSONSchema(
      attachmentsDeletedTriggerCommonDefinition.eventSchema
    ) as {
      properties: Record<string, { deprecated?: boolean }>;
    };

    expect(properties.ids.deprecated).toBeUndefined();
    expect(properties.attachmentIds.deprecated).toBe(true);
  });
});
