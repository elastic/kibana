/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type {
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { SKILL_DRAFT_ATTACHMENT_TYPE } from '../../common/attachments';
import { createSkillDraftAttachmentType } from '../../attachment_types/skill_draft';
import { createProposeSkillTool } from './propose_skill';
import { createPatchSkillDraftTool } from './patch_skill_draft';

/**
 * Build a minimal `ToolHandlerContext` carrying a real `AttachmentStateManager`.
 * We exercise the actual attachment validation pipeline (the same one the
 * production runner uses) so the tests catch any drift between the tool's
 * pre-flight Zod check and the attachment type's `validate`.
 */
const createTestContext = (): {
  context: ToolHandlerContext;
  attachments: ReturnType<typeof createAttachmentStateManager>;
} => {
  const skillDraftType = createSkillDraftAttachmentType();
  const attachments = createAttachmentStateManager([], {
    getTypeDefinition: (type) =>
      type === SKILL_DRAFT_ATTACHMENT_TYPE ? skillDraftType : undefined,
  });

  const context = {
    attachments,
  } as unknown as ToolHandlerContext;

  return { context, attachments };
};

const validProposeInput = {
  id: 'incident-triage',
  name: 'Incident triage',
  description: 'Use when investigating production incidents.',
  content: '## When to Use\n\nUse this skill when triaging incidents.',
  tool_ids: ['platform.core.execute_esql'],
};

describe('propose_skill tool', () => {
  it('creates a skill_draft attachment with version 1 and returns its id', async () => {
    const tool = createProposeSkillTool();
    const { context, attachments } = createTestContext();

    const result = (await tool.handler(validProposeInput, context)) as ToolHandlerStandardReturn;

    expect(result.results).toHaveLength(1);
    const [first] = result.results;
    expect(first.type).toBe(ToolResultType.other);

    const data = first.data as { attachment_id: string; version: number; skill_id: string };
    expect(data.skill_id).toBe('incident-triage');
    expect(data.version).toBe(1);

    const stored = attachments.get(data.attachment_id);
    expect(stored?.type).toBe(SKILL_DRAFT_ATTACHMENT_TYPE);
    expect(stored?.data.data).toMatchObject({
      id: 'incident-triage',
      tool_ids: ['platform.core.execute_esql'],
    });
  });

  it('returns an error result when the draft fails schema validation', async () => {
    const tool = createProposeSkillTool();
    const { context, attachments } = createTestContext();

    const result = (await tool.handler(
      { ...validProposeInput, id: 'Has-Uppercase' },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(attachments.getActive()).toHaveLength(0);
  });
});

describe('patch_skill_draft tool', () => {
  const seedDraft = async () => {
    const { context, attachments } = createTestContext();
    const proposeResult = (await createProposeSkillTool().handler(
      validProposeInput,
      context
    )) as ToolHandlerStandardReturn;
    const proposeData = proposeResult.results[0].data as { attachment_id: string };
    return { context, attachments, attachmentId: proposeData.attachment_id };
  };

  it('renames the draft and bumps the version', async () => {
    const { context, attachments, attachmentId } = await seedDraft();

    const result = (await createPatchSkillDraftTool().handler(
      {
        attachment_id: attachmentId,
        name: 'Incident triage v2',
      },
      context
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as { version: number };
    expect(data.version).toBe(2);
    const stored = attachments.get(attachmentId);
    expect((stored?.data.data as { name: string }).name).toBe('Incident triage v2');
  });

  it('applies a search-replace patch to content', async () => {
    const { context, attachments, attachmentId } = await seedDraft();

    const result = (await createPatchSkillDraftTool().handler(
      {
        attachment_id: attachmentId,
        content_patches: [
          {
            find: 'triaging incidents',
            replace: 'triaging production incidents quickly',
          },
        ],
      },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.other);
    const stored = attachments.get(attachmentId);
    expect((stored?.data.data as { content: string }).content).toContain(
      'triaging production incidents quickly'
    );
  });

  it('returns an error and does not mutate state when a patch text is missing', async () => {
    const { context, attachments, attachmentId } = await seedDraft();
    const before = attachments.get(attachmentId);

    const result = (await createPatchSkillDraftTool().handler(
      {
        attachment_id: attachmentId,
        content_patches: [{ find: 'this string is not in the content', replace: 'x' }],
      },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    const after = attachments.get(attachmentId);
    expect(after?.version).toBe(before?.version);
  });

  it('returns an error when the attachment id is unknown', async () => {
    const { context } = createTestContext();
    const result = (await createPatchSkillDraftTool().handler(
      { attachment_id: 'does-not-exist', name: 'New name' },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
  });

  it('adds and removes referenced files', async () => {
    const { context, attachments, attachmentId } = await seedDraft();

    const addResult = (await createPatchSkillDraftTool().handler(
      {
        attachment_id: attachmentId,
        referenced_files_to_add: [
          { name: 'examples', relativePath: './examples', content: '# Examples\n' },
        ],
      },
      context
    )) as ToolHandlerStandardReturn;
    expect(addResult.results[0].type).toBe(ToolResultType.other);

    const stored = attachments.get(attachmentId);
    expect(
      (stored?.data.data as { referenced_content?: Array<{ name: string }> }).referenced_content
    ).toHaveLength(1);

    const removeResult = (await createPatchSkillDraftTool().handler(
      {
        attachment_id: attachmentId,
        referenced_files_to_remove: [{ name: 'examples', relativePath: './examples' }],
      },
      context
    )) as ToolHandlerStandardReturn;
    expect(removeResult.results[0].type).toBe(ToolResultType.other);

    const finalStored = attachments.get(attachmentId);
    expect(
      (finalStored?.data.data as { referenced_content?: unknown[] }).referenced_content?.length ?? 0
    ).toBe(0);
  });
});
