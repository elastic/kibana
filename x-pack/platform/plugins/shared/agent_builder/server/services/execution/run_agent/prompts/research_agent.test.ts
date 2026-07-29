/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { getResearchAgentPrompt } from './research_agent';
import { convertPreviousRounds } from '../utils/to_langchain_messages';

jest.mock('../utils/to_langchain_messages', () => ({
  convertPreviousRounds: jest.fn().mockResolvedValue([['human', 'history']]),
}));

// Unique marker present only in the injected notification, not in the static pointer prose.
const NOTICE_MARKER = 'The following skills appear relevant';

describe('getResearchAgentPrompt', () => {
  const now = new Date().toISOString();

  const makeParams = (overrides: Record<string, any> = {}) =>
    ({
      conversationTimestamp: now,
      processedConversation: {
        previousRounds: [],
        nextInput: { message: '', attachments: [] },
        attachments: [],
        attachmentTypes: [],
        attachmentStateManager: createAttachmentStateManager([], {
          getTypeDefinition: (type: string) =>
            ({
              id: type,
              validate: (input: unknown) => ({ valid: true, data: input }),
              format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
            } as any),
        }),
      },
      configuration: { instructions: '' },
      capabilities: { visualizations: false },
      skills: [],
      actions: [],
      cycleLimit: 1,
      experimentalFeatures: { bash: false, skills: false },
      relevantSkillsEnabled: false,
      toolManager: {} as any,
      resultTransformer: jest.fn(),
      renderers: [],
      ...overrides,
    } as any);

  const asText = (m: any): string =>
    Array.isArray(m) ? String(m[1]) : typeof m?.content === 'string' ? m.content : '';

  const alphaSkill = {
    id: 'a.alpha',
    name: 'alpha',
    description: 'Alpha skill',
    basePath: 'skills/a',
    referencedContent: [],
  };

  it('does not render the current date in the system message and forwards conversationTimestamp', async () => {
    const messages = await getResearchAgentPrompt(makeParams());

    const systemMessage = (messages[0] as ['system', string])[1];
    expect(systemMessage).not.toContain('Current date');
    expect(convertPreviousRounds).toHaveBeenCalledWith(
      expect.objectContaining({ conversationTimestamp: now })
    );
  });

  it('renders the full skill list when skills is on and relevant-skills is off', async () => {
    const messages = await getResearchAgentPrompt(
      makeParams({
        experimentalFeatures: { bash: false, skills: true },
        relevantSkillsEnabled: false,
        skills: [alphaSkill],
      })
    );
    const system = asText(messages[0]);
    expect(system).toContain('### Available skills');
    expect(system).toMatch(/- alpha \(.+SKILL\.md\): Alpha skill/);
    expect(system).not.toContain('search_relevant_skills');
  });

  it('renders the static pointer with no per-skill lines when relevant-skills is on', async () => {
    const messages = await getResearchAgentPrompt(
      makeParams({
        experimentalFeatures: { bash: false, skills: true },
        relevantSkillsEnabled: true,
        skills: [alphaSkill],
      })
    );
    const system = asText(messages[0]);
    expect(system).toContain('## SKILLS');
    expect(system).toContain('search_relevant_skills');
    expect(system).not.toContain('### Available skills');
    expect(system).not.toMatch(/- alpha \(.+SKILL\.md\)/);
  });

  it('injects the <relevant_skills> notice after previous rounds when a selection is provided', async () => {
    const messages = await getResearchAgentPrompt(
      makeParams({
        experimentalFeatures: { bash: false, skills: true },
        relevantSkillsEnabled: true,
        relevantSkills: {
          skills: [
            {
              id: 'a.alpha',
              name: 'alpha',
              path: '/p/SKILL.md',
              description: 'Alpha skill',
              relevance_note: 'fits the request',
            },
          ],
        },
      })
    );
    const texts = messages.map(asText);
    const noticeIdx = texts.findIndex((t) => t.includes(NOTICE_MARKER));
    const historyIdx = texts.findIndex((t) => t.includes('history'));
    expect(noticeIdx).toBeGreaterThan(-1);
    expect(noticeIdx).toBeGreaterThan(historyIdx); // after the (mocked) previous rounds
    expect(texts[noticeIdx]).toContain('- alpha (/p/SKILL.md): Alpha skill');
    expect(texts[noticeIdx]).toContain('fits the request');
  });

  it('injects no notice when relevant-skills is disabled even if a selection is present', async () => {
    const messages = await getResearchAgentPrompt(
      makeParams({
        experimentalFeatures: { bash: false, skills: true },
        relevantSkillsEnabled: false,
        relevantSkills: { skills: [{ id: 'a', name: 'a', path: '/p', description: 'd' }] },
      })
    );
    expect(messages.map(asText).some((t) => t.includes(NOTICE_MARKER))).toBe(false);
  });

  it('injects no notice when the selection is empty', async () => {
    const messages = await getResearchAgentPrompt(
      makeParams({
        experimentalFeatures: { bash: false, skills: true },
        relevantSkillsEnabled: true,
        relevantSkills: { skills: [] },
      })
    );
    expect(messages.map(asText).some((t) => t.includes(NOTICE_MARKER))).toBe(false);
  });
});
