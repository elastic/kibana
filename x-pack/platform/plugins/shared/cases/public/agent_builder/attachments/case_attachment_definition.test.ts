/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applicationServiceMock } from '@kbn/core/public/mocks';
import { createCaseAttachmentDefinition } from './case_attachment_definition';
import { CASE_ATTACHMENT_TYPE } from '../../../common/types/agent_builder/attachment_schemas';
import type { CaseAttachment } from './case_inline_content';

const attachment: CaseAttachment = {
  id: 'abc',
  type: CASE_ATTACHMENT_TYPE,
  data: {
    id: 'abc',
    incremental_id: 101,
    title: 'Suspicious PowerShell on finance hosts',
    description: 'Encoded command lines on four hosts.',
    status: 'in-progress',
    severity: 'high',
    totalAlerts: 24,
    totalComment: 8,
    total_observables: 5,
    tags: ['windows'],
    owner: 'securitySolution',
    assignees: [{ uid: 'drew' }, { uid: 'sam' }],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    url: '/app/security/cases/abc',
  },
};

describe('createCaseAttachmentDefinition', () => {
  it('supplies an Adaptive UI ViewSpec for the inline body', () => {
    const definition = createCaseAttachmentDefinition({
      application: applicationServiceMock.createStartContract(),
    });
    const spec = definition.getViewSpec?.(attachment);
    expect(spec?.title).toContain('Suspicious PowerShell');
    expect(spec?.body.some((node) => node.type === 'statGroup')).toBe(true);
  });
});
