/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  attachmentAddedTriggerCommonDefinition,
  attachmentUpdatedTriggerCommonDefinition,
  attachmentDeletedTriggerCommonDefinition,
} from './attachments';

describe('attachment trigger definitions', () => {
  const base = { conversationId: 'conv-1', attachmentId: 'att-1', attachmentType: 'text' };

  it('ai.attachmentAdded parses a valid payload and rejects a missing source', () => {
    const schema = attachmentAddedTriggerCommonDefinition.eventSchema;
    expect(attachmentAddedTriggerCommonDefinition.id).toBe('ai.attachmentAdded');
    expect(schema.safeParse({ ...base, currentVersion: 1, source: 'http_api' }).success).toBe(true);
    expect(schema.safeParse({ ...base, currentVersion: 1 }).success).toBe(false);
  });

  it('ai.attachmentUpdated parses a valid payload and rejects a missing source', () => {
    const schema = attachmentUpdatedTriggerCommonDefinition.eventSchema;
    expect(attachmentUpdatedTriggerCommonDefinition.id).toBe('ai.attachmentUpdated');
    expect(
      schema.safeParse({ ...base, previousVersion: 1, currentVersion: 2, source: 'workflow' })
        .success
    ).toBe(true);
    expect(schema.safeParse({ ...base, previousVersion: 1, currentVersion: 2 }).success).toBe(
      false
    );
  });

  it('ai.attachmentDeleted parses a valid payload and rejects a missing source', () => {
    const schema = attachmentDeletedTriggerCommonDefinition.eventSchema;
    expect(attachmentDeletedTriggerCommonDefinition.id).toBe('ai.attachmentDeleted');
    expect(schema.safeParse({ ...base, hardDelete: true, source: 'execution' }).success).toBe(true);
    expect(schema.safeParse({ ...base, hardDelete: true }).success).toBe(false);
  });

  it('rejects an unknown source value', () => {
    expect(
      attachmentAddedTriggerCommonDefinition.eventSchema.safeParse({
        ...base,
        currentVersion: 1,
        source: 'somewhere',
      }).success
    ).toBe(false);
  });
});
