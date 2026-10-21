/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { createSkillAttachmentType } from './skill';
import { SURFACE_BASE_URL, renderSurface, surfaceContext } from './test_helpers';
import { SKILL_ATTACHMENT_TYPE, type SkillAttachmentData } from '../../common/attachments';

const validSkill: SkillAttachmentData = {
  mode: 'create',
  skill: {
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
  },
};

const formatContext = {
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'default',
};

const buildAttachment = (
  data: SkillAttachmentData
): Attachment<typeof SKILL_ATTACHMENT_TYPE, SkillAttachmentData> => ({
  id: 'test-attachment-id',
  type: SKILL_ATTACHMENT_TYPE,
  data,
});

describe('skill attachment type', () => {
  const definition = createSkillAttachmentType();

  describe('validate', () => {
    it('accepts a fully populated payload', async () => {
      const result = await definition.validate(validSkill, formatContext);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.skill.id).toBe('incident-triage');
      }
    });

    it('rejects an empty content body', async () => {
      const result = await definition.validate(
        {
          ...validSkill,
          skill: { ...validSkill.skill, content: '' },
        },
        formatContext
      );
      expect(result.valid).toBe(false);
    });

    it('rejects an id with uppercase letters', async () => {
      const result = await definition.validate(
        {
          ...validSkill,
          skill: { ...validSkill.skill, id: 'Incident-Triage' },
        },
        formatContext
      );
      expect(result.valid).toBe(false);
    });

    it('rejects a referenced file with a path outside ./', async () => {
      const result = await definition.validate(
        {
          ...validSkill,
          skill: {
            ...validSkill.skill,
            referenced_content: [{ name: 'examples', relativePath: '/examples', content: 'x' }],
          },
        },
        formatContext
      );
      expect(result.valid).toBe(false);
    });

    it('rejects more than 5 tool_ids', async () => {
      const result = await definition.validate(
        {
          ...validSkill,
          skill: {
            ...validSkill.skill,
            tool_ids: Array.from({ length: 6 }, (_, i) => `tool_${i}`),
          },
        },
        formatContext
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('format', () => {
    it('produces a markdown text representation containing the content body', async () => {
      const attachment = buildAttachment(validSkill);
      const formatted = await definition.format(attachment, formatContext);
      const repr = await formatted.getRepresentation?.();
      expect(repr?.type).toBe('text');
      if (repr?.type !== 'text') throw new Error('expected text representation');
      expect(repr.value).toContain('Skill (id: incident-triage)');
      expect(repr.value).toContain(validSkill.skill.content);
      expect(repr.value).toContain('platform.core.execute_esql');
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

describe('skill toSurfaceComposition', () => {
  const definition = createSkillAttachmentType();

  it('shows the description, tools, files and content', async () => {
    const composition = await definition.toSurfaceComposition?.(
      buildAttachment(validSkill),
      surfaceContext
    );

    expect(composition).toEqual({
      type: 'view',
      title: 'Incident triage',
      subtitle: 'incident-triage',
      body: [
        { type: 'markdown', text: 'Use when investigating production incidents.' },
        {
          type: 'fields',
          items: [
            { label: 'Tools', value: 'platform.core.execute_esql' },
            { label: 'Files', value: './examples/examples.md' },
          ],
        },
        {
          type: 'code',
          language: 'markdown',
          text: '## When to Use\n\nUse this skill when triaging incidents.',
        },
      ],
    });
    expect((await renderSurface(composition)).valid).toBe(true);
  });

  it('links to the skill in Management once it is persisted', async () => {
    const composition = await definition.toSurfaceComposition?.(
      { ...buildAttachment(validSkill), origin: 'incident triage' },
      surfaceContext
    );

    expect(composition?.body.at(-1)).toEqual({
      type: 'link',
      label: 'Edit in Management',
      app: 'agent_builder',
      path: '/manage/skills/incident%20triage',
    });

    const { valid, slack } = await renderSurface(composition);
    expect(valid).toBe(true);
    expect(slack).toContain(
      `${SURFACE_BASE_URL}/app/agent_builder/manage/skills/incident%20triage`
    );
  });

  it('cuts long content and says so, and still renders', async () => {
    const content = 'x'.repeat(20000);
    const composition = await definition.toSurfaceComposition?.(
      buildAttachment({
        ...validSkill,
        skill: { ...validSkill.skill, content, tool_ids: Array(400).fill('platform.core.tool') },
      }),
      surfaceContext
    );

    expect(JSON.stringify(composition)).toContain(
      'Showing the first 12000 of 20000 characters of SKILL.md.'
    );

    const { valid, errors } = await renderSurface(composition);
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
  });
});
