/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { SECURITY_SOLUTION_OWNER } from '../../constants';
import { attachmentsAddedTriggerCommonDefinition } from '.';

describe('attachmentsAdded trigger', () => {
  const payload = {
    caseId: 'case-1',
    owner: SECURITY_SOLUTION_OWNER,
    ids: ['attachment-1'],
    attachmentIds: ['attachment-1'],
    attachmentType: 'comment',
  };

  it('accepts a payload with ids and the deprecated attachmentIds', () => {
    expect(attachmentsAddedTriggerCommonDefinition.eventSchema.safeParse(payload).success).toBe(
      true
    );
  });

  it('requires ids', () => {
    const { ids, ...withoutIds } = payload;

    expect(attachmentsAddedTriggerCommonDefinition.eventSchema.safeParse(withoutIds).success).toBe(
      false
    );
  });

  it('marks attachmentIds as deprecated in favor of ids', () => {
    const { properties } = z.toJSONSchema(attachmentsAddedTriggerCommonDefinition.eventSchema) as {
      properties: Record<string, { deprecated?: boolean }>;
    };

    expect(properties.ids.deprecated).toBeUndefined();
    expect(properties.attachmentIds.deprecated).toBe(true);
  });
});
