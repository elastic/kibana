/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlanningPromptFactory } from './planning_prompt_factory';
import type { Plan } from '@kbn/agent-builder-common';
import type { ProcessedConversation } from '../../utils/prepare_conversation';

const createMockProcessedConversation = (
  overrides: Partial<ProcessedConversation> = {}
): ProcessedConversation => ({
  previousRounds: [],
  nextInput: {
    message: 'Test user message',
    attachments: [],
  },
  attachmentTypes: [],
  attachments: [],
  attachmentStateManager: {} as ProcessedConversation['attachmentStateManager'],
  ...overrides,
});

const getSystemContent = (
  messages: Awaited<ReturnType<ReturnType<typeof createPlanningPromptFactory>['getMainPrompt']>>
): string => {
  // System message is now a tuple: ['system', content]
  const systemMsg = messages[0];
  if (Array.isArray(systemMsg)) {
    return systemMsg[1] as string;
  }
  return '';
};

describe('createPlanningPromptFactory', () => {
  const mockConversation = createMockProcessedConversation();

  describe('PromptFactory interface', () => {
    it('returns object implementing PromptFactory (has getMainPrompt, getAnswerPrompt, getStructuredAnswerPrompt)', () => {
      const factory = createPlanningPromptFactory({
        existingPlan: undefined,
        processedConversation: mockConversation,
      });

      expect(factory).toHaveProperty('getMainPrompt');
      expect(factory).toHaveProperty('getAnswerPrompt');
      expect(factory).toHaveProperty('getStructuredAnswerPrompt');
      expect(typeof factory.getMainPrompt).toBe('function');
      expect(typeof factory.getAnswerPrompt).toBe('function');
      expect(typeof factory.getStructuredAnswerPrompt).toBe('function');
    });
  });

  describe('getMainPrompt', () => {
    it('returns array with system message and user message', async () => {
      const factory = createPlanningPromptFactory({
        existingPlan: undefined,
        processedConversation: mockConversation,
      });
      const messages = await factory.getMainPrompt({ actions: [] });

      // Should have at least system message + user message from nextInput
      expect(messages.length).toBeGreaterThanOrEqual(2);
    });

    it('system message includes planning protocol instructions', async () => {
      const factory = createPlanningPromptFactory({
        existingPlan: undefined,
        processedConversation: mockConversation,
      });
      const messages = await factory.getMainPrompt({ actions: [] });
      const systemContent = getSystemContent(messages);

      expect(systemContent).toContain('Planning Protocol');
      expect(systemContent).toContain('Understand the request');
      expect(systemContent).toContain('Mark ready');
    });

    it('system message includes list_available_tools for capability discovery', async () => {
      const factory = createPlanningPromptFactory({
        existingPlan: undefined,
        processedConversation: mockConversation,
      });
      const messages = await factory.getMainPrompt({ actions: [] });
      const systemContent = getSystemContent(messages);

      expect(systemContent).toContain('list_available_tools');
    });

    it('system message includes create_plan instructions', async () => {
      const factory = createPlanningPromptFactory({
        existingPlan: undefined,
        processedConversation: mockConversation,
      });
      const messages = await factory.getMainPrompt({ actions: [] });
      const systemContent = getSystemContent(messages);

      expect(systemContent).toContain('create_plan');
    });

    it('system message instructs agent NOT to execute (contains MUST NOT execute)', async () => {
      const factory = createPlanningPromptFactory({
        existingPlan: undefined,
        processedConversation: mockConversation,
      });
      const messages = await factory.getMainPrompt({ actions: [] });
      const systemContent = getSystemContent(messages);

      expect(systemContent).toContain('MUST NOT execute');
    });
  });

  describe('existingPlan handling', () => {
    it('when existingPlan is provided, system message includes plan state (title, status, items)', async () => {
      const existingPlan: Plan = {
        title: 'My Test Plan',
        description: 'A plan for testing',
        status: 'draft',
        source: 'planning',
        action_items: [
          { description: 'First action', status: 'pending' },
          {
            description: 'Second action',
            status: 'in_progress',
            related_tools: ['platform.search'],
          },
        ],
      };

      const factory = createPlanningPromptFactory({
        existingPlan,
        processedConversation: mockConversation,
      });
      const messages = await factory.getMainPrompt({ actions: [] });
      const systemContent = getSystemContent(messages);

      expect(systemContent).toContain('Current Plan State');
      expect(systemContent).toContain('Title: My Test Plan');
      expect(systemContent).toContain('Status: draft');
      expect(systemContent).toContain('Source: planning');
      expect(systemContent).toContain('Description: A plan for testing');
      expect(systemContent).toContain('Action Items:');
      expect(systemContent).toContain('First action');
      expect(systemContent).toContain('Second action');
      expect(systemContent).toContain('platform.search');
    });

    it('when existingPlan is not provided, system message does NOT include plan state section', async () => {
      const factory = createPlanningPromptFactory({
        existingPlan: undefined,
        processedConversation: mockConversation,
      });
      const messages = await factory.getMainPrompt({ actions: [] });
      const systemContent = getSystemContent(messages);

      expect(systemContent).not.toContain('Current Plan State');
      expect(systemContent).not.toContain('Action Items:');
    });
  });

  describe('getAnswerPrompt and getStructuredAnswerPrompt', () => {
    it('getAnswerPrompt includes system message', async () => {
      const factory = createPlanningPromptFactory({
        existingPlan: undefined,
        processedConversation: mockConversation,
      });
      const answerMessages = await factory.getAnswerPrompt({
        actions: [],
        answerActions: [],
      });
      const answerContent = getSystemContent(answerMessages);

      expect(answerContent).toContain('planning mode');
      expect(answerContent).toContain('Planning Protocol');
    });

    it('getStructuredAnswerPrompt includes system message', async () => {
      const factory = createPlanningPromptFactory({
        existingPlan: undefined,
        processedConversation: mockConversation,
      });
      const structuredMessages = await factory.getStructuredAnswerPrompt({
        actions: [],
        answerActions: [],
      });
      const structuredContent = getSystemContent(structuredMessages);

      expect(structuredContent).toContain('planning mode');
      expect(structuredContent).toContain('Planning Protocol');
    });
  });
});
