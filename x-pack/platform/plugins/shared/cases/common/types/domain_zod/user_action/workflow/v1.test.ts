/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowOriginSchema } from './v1';

describe('WorkflowOriginSchema', () => {
  it.each([
    { type: 'cases.case', id: 'case-1' },
    { type: 'cases.observable', id: 'observable-1', typeKey: 'ip', value: '127.0.0.1' },
    { type: 'cases.observables', id: 'case-1', count: 2 },
    {
      type: 'cases.attachment',
      id: 'attachment-1',
      attachmentType: 'security.alert',
      index: '.alerts',
    },
    {
      type: 'cases.attachments',
      id: 'case-1',
      attachmentType: 'security.alert',
      count: 2,
    },
  ])('accepts $type', (origin) => {
    expect(WorkflowOriginSchema.safeParse(origin).success).toBe(true);
  });

  it.each(['cases.attachment', 'cases.attachments'])('requires attachmentType for %s', (type) => {
    expect(WorkflowOriginSchema.safeParse({ type, id: 'attachment-1' }).success).toBe(false);
  });

  it('strips fields that do not belong to the selected variant', () => {
    expect(
      WorkflowOriginSchema.parse({
        type: 'cases.case',
        id: 'case-1',
        attachmentType: 'security.alert',
      })
    ).toEqual({ type: 'cases.case', id: 'case-1' });
  });
});
