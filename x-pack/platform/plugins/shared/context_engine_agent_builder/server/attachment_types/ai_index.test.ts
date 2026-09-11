/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import {
  AI_INDEX_AUTOMATIONS_SKILL_ID,
  AI_INDEX_SOURCES_SKILL_ID,
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

  it('names the skill for each thing the conversation might do', () => {
    const description = attachmentType.getAgentDescription?.();

    expect(description).toContain(KI_RETRIEVAL_SKILL_ID);
    expect(description).toContain(ANALYZE_AND_IMPROVE_SKILL_ID);
    expect(description).toContain(AI_INDEX_AUTOMATIONS_SKILL_ID);
    expect(description).toContain(AI_INDEX_SOURCES_SKILL_ID);
    expect(description).toContain(CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID);
  });

  it('carries the interaction choreography the skills leave out', () => {
    const description = attachmentType.getAgentDescription?.();

    expect(description).toContain('ask_user_question');
    expect(description).toMatch(/Build a new automation through a subagent/);
    expect(description).toMatch(/Report what the subagent came back with/);
  });

  it('saves the piloted yaml rather than a regenerated definition', () => {
    const description = attachmentType.getAgentDescription?.();

    expect(description).toContain('`workflowYaml`');
    expect(description).toMatch(/Never re-generate the definition the subagent returned/);
  });

  it('puts the question before the build and not before the save', () => {
    const description = attachmentType.getAgentDescription?.();

    expect(description).toMatch(/Ask before you build/);
    expect(description).toMatch(/Do not ask before you save or run/);
    expect(description).toMatch(/The question you owed was the one before the build/);
  });

  it('settles the first automation rather than asking a question with one answer', () => {
    const description = attachmentType.getAgentDescription?.();

    expect(description).toMatch(
      /An index with no automations starts at Index\/Table Metadata: that is settled/
    );
  });

  it('asks for intent on an index that already has automations, where it cannot be inferred', () => {
    const description = attachmentType.getAgentDescription?.();

    expect(description).toMatch(
      /may want new coverage, may want something that is not working fixed/
    );
    expect(description).toMatch(/where the answer is new coverage, ask which strategy/);
    expect(description).toContain('ask_user_question');
  });

  it('gates every subagent handoff on a confirmed plan, replacements included', () => {
    const description = attachmentType.getAgentDescription?.();

    expect(description).toMatch(
      /always ask again before handing anything to a subagent, whether it would create an automation or replace one/
    );
    expect(description).toMatch(/naming the automation being replaced/);
    expect(description).toMatch(/Propose values rather than asking for them/);
  });

  it('suppresses the workflow preview, which other attachments ask the agent to render', () => {
    const description = attachmentType.getAgentDescription?.();

    expect(description).toMatch(/Never render the workflow attachment preview/);
    expect(description).toMatch(/render that and nothing else/);
  });

  it('leaves the save decision to the tool confirmation rather than a chat question', () => {
    const description = attachmentType.getAgentDescription?.();

    expect(description).toMatch(/Never end a turn asking for permission to save or to run/);
    expect(description).toMatch(/never offer them as separate choices/);
  });

  it('runs as part of the save, so one dialog covers both decisions', () => {
    const description = attachmentType.getAgentDescription?.();

    expect(description).toMatch(/`run` set to true/);
    expect(description).toMatch(/that dialog names the full-corpus run/);
    expect(description).toMatch(/do not follow a save with an `ask_user_question` offering to run/);
  });

  it('makes the tool the thing that runs the automation, not the agent', () => {
    const description = attachmentType.getAgentDescription?.();

    expect(description).toMatch(/The tool starts that run itself once the dialog is accepted/);
    expect(description).toMatch(/execution id to poll rather than a finished result/);
  });

  it('treats a failed run as something to report rather than to retry by hand', () => {
    const description = attachmentType.getAgentDescription?.();

    expect(description).toMatch(/When `run.started` is false the run did not happen/);
    expect(description).toMatch(/Never answer a failed run by executing the workflow yourself/);
    expect(description).toMatch(/a second one starts the automation twice/);
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
