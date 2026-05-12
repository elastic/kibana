/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentFormatContext } from '@kbn/agent-builder-server/attachments';
import { httpServerMock } from '@kbn/core/server/mocks';
import { createCaseAttachmentType } from './case_attachment_type';
import { createCasesAttachmentType } from './cases_attachment_type';
import {
  CASE_ATTACHMENT_TYPE,
  CASES_ATTACHMENT_TYPE,
  type CaseAttachmentData,
} from '../../../common/types/agent_builder/attachment_schemas';

const buildCaseData = (overrides: Partial<CaseAttachmentData> = {}): CaseAttachmentData => ({
  id: 'abc',
  incremental_id: 125,
  title: 'Threat Intel Filebeat',
  description: 'Threat description',
  status: 'in-progress',
  severity: 'critical',
  totalAlerts: 3,
  totalComment: 5,
  tags: ['Phishing'],
  owner: 'securitySolution',
  assignees: [{ uid: 'u1' }],
  ...overrides,
});

const formatContext: AttachmentFormatContext = {
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'default',
};

const buildCaseAttachment = (
  data: CaseAttachmentData
): Attachment<typeof CASE_ATTACHMENT_TYPE, CaseAttachmentData> => ({
  id: data.id,
  type: CASE_ATTACHMENT_TYPE,
  data,
});

describe('case attachment type', () => {
  it('validates a valid case payload', async () => {
    const result = await createCaseAttachmentType().validate(buildCaseData());
    expect(result.valid).toBe(true);
  });

  it('rejects an invalid payload', async () => {
    const result = await createCaseAttachmentType().validate({ id: 'abc' });
    expect(result.valid).toBe(false);
  });

  it('format() returns text representation including title and counts', async () => {
    const def = createCaseAttachmentType();
    const formatted = await def.format(buildCaseAttachment(buildCaseData()), formatContext);
    const repr = await formatted.getRepresentation!();
    expect(repr.type).toBe('text');
    expect(repr.value).toContain('Threat Intel Filebeat');
    expect(repr.value).toContain('#125');
    expect(repr.value).toContain('Status: in-progress');
    expect(repr.value).toContain('Severity: critical');
    expect(repr.value).toContain('Alerts: 3');
    expect(repr.value).toContain('Comments: 5');
    expect(repr.value).toContain('Phishing');
  });
});

describe('cases (list) attachment type', () => {
  it('validates a valid list payload', async () => {
    const result = await createCasesAttachmentType().validate({
      cases: [buildCaseData(), buildCaseData({ id: 'def', incremental_id: 126 })],
      total: 2,
    });
    expect(result.valid).toBe(true);
  });

  it('format() summarises every case', async () => {
    const def = createCasesAttachmentType();
    const attachment = {
      id: 'list-attachment',
      type: CASES_ATTACHMENT_TYPE,
      data: {
        cases: [buildCaseData(), buildCaseData({ id: 'def', incremental_id: 126, title: 'Other' })],
        total: 2,
      },
    } as Attachment<typeof CASES_ATTACHMENT_TYPE, { cases: CaseAttachmentData[]; total: number }>;
    const formatted = await def.format(attachment, formatContext);
    const repr = await formatted.getRepresentation!();
    expect(repr.type).toBe('text');
    expect(repr.value).toContain('Showing 2 of 2 case(s)');
    expect(repr.value).toContain('#125');
    expect(repr.value).toContain('#126');
    expect(repr.value).toContain('Threat Intel Filebeat');
    expect(repr.value).toContain('Other');
  });
});
