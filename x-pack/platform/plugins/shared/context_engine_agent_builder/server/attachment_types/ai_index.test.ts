/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import {
  ANALYZE_AND_IMPROVE_SKILL_ID,
  KI_RETRIEVAL_SKILL_ID,
} from '../../common/agent_builder_skills';
import { CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID } from '../../common/agent_builder_tools';
import { createAiIndexAttachmentType } from './ai_index';

describe('createAiIndexAttachmentType', () => {
  const attachmentType = createAiIndexAttachmentType();
  const formatContext = {
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'default',
  };

  const validData = {
    id: 'my-ai-index',
    description: 'Support tickets',
    dest: { type: 'data_stream' as const, value: 'ai-index-ds-my-ai-index' },
    sources: [{ type: 'esql' as const, value: 'FROM tickets' }],
    automations: [{ type: 'workflow' as const, value: 'wf-1' }],
  };

  it('registers the expected attachment type id', () => {
    expect(attachmentType.id).toBe('platform.context_engine.ai_index');
    expect(attachmentType.isReadonly).toBe(true);
    expect(attachmentType.getTools?.()).toEqual([CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID]);
  });

  it('validates attachment data', async () => {
    const result = await attachmentType.validate(validData);
    expect(result).toEqual({ valid: true, data: validData });
  });

  it('rejects invalid attachment data', async () => {
    const result = await attachmentType.validate({ id: 'only-id' });
    expect(result.valid).toBe(false);
  });

  it('describes neutral attachment usage without forcing automation skill load', () => {
    const description = attachmentType.getAgentDescription?.();

    expect(description).toContain(KI_RETRIEVAL_SKILL_ID);
    expect(description).toContain(ANALYZE_AND_IMPROVE_SKILL_ID);
    expect(description).not.toMatch(
      new RegExp(`Load the \`${ANALYZE_AND_IMPROVE_SKILL_ID}\` skill and follow`)
    );
    expect(description).toContain(CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID);
  });

  it('carries the interactive choreography, which the skill deliberately leaves out', () => {
    // The skill is loaded by unattended runs too, where there is nobody to answer a question and
    // no diff to render. Attaching an AI index is what makes the conversation interactive, so the
    // turn-by-turn rules belong to the attachment.
    const description = attachmentType.getAgentDescription?.();

    expect(description).toContain('ask_user_question');
    expect(description).toContain('corpus filter');
    expect(description).toMatch(/render the diff in chat first/);
    expect(description).toMatch(/Do not run a workflow until it has been saved/);
  });

  it('formats the attachment for the agent', async () => {
    const formatted = await attachmentType.format(
      {
        id: 'attachment-1',
        type: attachmentType.id,
        data: validData,
      },
      formatContext
    );
    const representation = await formatted.getRepresentation?.();

    expect(representation).toEqual({
      type: 'text',
      value: expect.stringContaining('AI index: my-ai-index'),
    });
    if (representation?.type !== 'text') {
      throw new Error('expected a text representation');
    }
    expect(representation.value).toContain('Destination: data_stream "ai-index-ds-my-ai-index"');
    expect(representation.value).toContain('Sources: esql:FROM tickets');
    expect(representation.value).toContain('Existing automations (workflow ids): wf-1');
  });
});
