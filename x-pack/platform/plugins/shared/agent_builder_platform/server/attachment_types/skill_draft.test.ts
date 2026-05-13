/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { createSkillDraftAttachmentType } from './skill_draft';
import {
  SKILL_DRAFT_ATTACHMENT_TYPE,
  type SkillDraftAttachmentData,
} from '../../common/attachments';

const validDraft: SkillDraftAttachmentData = {
  id: 'incident-triage',
  name: 'Incident triage',
  description: 'Use when investigating production incidents.',
  content: '## When to Use\n\nUse this skill when triaging incidents.',
  tool_ids: ['platform.core.execute_esql'],
  referenced_content: [
    {
      name: 'examples',
      relativePath: './examples',
      content: '# Triage examples\n\nN/A.',
    },
  ],
};

const formatContext = {
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'default',
};

const buildAttachment = (
  data: SkillDraftAttachmentData
): Attachment<typeof SKILL_DRAFT_ATTACHMENT_TYPE, SkillDraftAttachmentData> => ({
  id: 'test-attachment-id',
  type: SKILL_DRAFT_ATTACHMENT_TYPE,
  data,
});

describe('skill_draft attachment type', () => {
  const definition = createSkillDraftAttachmentType();

  describe('validate', () => {
    it('accepts a fully populated draft', async () => {
      const result = await definition.validate(validDraft);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.id).toBe('incident-triage');
      }
    });

    it('rejects an empty content body', async () => {
      const result = await definition.validate({ ...validDraft, content: '' });
      expect(result.valid).toBe(false);
    });

    it('rejects an id with uppercase letters', async () => {
      const result = await definition.validate({ ...validDraft, id: 'Incident-Triage' });
      expect(result.valid).toBe(false);
    });

    it('rejects a referenced file with a path outside ./', async () => {
      const result = await definition.validate({
        ...validDraft,
        referenced_content: [{ name: 'examples', relativePath: '/examples', content: 'x' }],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects more than 5 tool_ids', async () => {
      const result = await definition.validate({
        ...validDraft,
        tool_ids: Array.from({ length: 6 }, (_, i) => `tool_${i}`),
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('format', () => {
    it('produces a markdown text representation containing the content body', async () => {
      const attachment = buildAttachment(validDraft);
      const formatted = await definition.format(attachment, formatContext);
      const repr = await formatted.getRepresentation?.();
      expect(repr?.type).toBe('text');
      expect(repr?.value).toContain('Skill draft (id: incident-triage)');
      expect(repr?.value).toContain(validDraft.content);
      expect(repr?.value).toContain('platform.core.execute_esql');
    });
  });

  describe('getAgentDescription', () => {
    it('returns instructions that mention render_attachment', () => {
      const description = definition.getAgentDescription?.();
      expect(description).toBeDefined();
      expect(description).toContain('render_attachment');
    });
  });
});
