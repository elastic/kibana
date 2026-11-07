/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { investigationCaseAttachmentPayloadSchema, openCaseRequestSchema, parseAiVerdict } from '.';

describe('cases bridge schemas', () => {
  it('accepts an investigation link with only the server-stamped metadata keys', () => {
    expect(
      investigationCaseAttachmentPayloadSchema.safeParse({
        type: 'agentic.investigation',
        owner: 'securitySolution',
        attachmentId: 'inv-1',
        metadata: { title: 'LSASS dump', linkedBy: 'jordan' },
      }).success
    ).toBe(true);
    expect(
      investigationCaseAttachmentPayloadSchema.safeParse({
        type: 'agentic.investigation',
        owner: 'securitySolution',
        attachmentId: 'inv-1',
        data: { copied: true },
      }).success
    ).toBe(false);
  });

  it('defaults the open-a-case request to no extra links and no push', () => {
    expect(openCaseRequestSchema.parse({ title: 'Case', visibility: 'restricted' })).toEqual({
      title: 'Case',
      visibility: 'restricted',
      assignees: [],
      linked_investigation_ids: [],
      push: false,
    });
  });

  it('takes an AI verdict only from text that starts with a verdict label', () => {
    expect(parseAiVerdict('True positive: credential dumping confirmed')).toBe('true_positive');
    expect(parseAiVerdict('false_positive - admin tool')).toBe('false_positive');
    expect(parseAiVerdict('Benign: scheduled backup')).toBe('benign_positive');
    expect(parseAiVerdict('The process looked like a backup job')).toBeUndefined();
    expect(parseAiVerdict(undefined)).toBeUndefined();
  });
});
