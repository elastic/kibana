/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import { getEscalationTabIds, getInvestigationTabIds } from '@kbn/agentic-investigations-common';
import { AgenticInvestigationsPublicPlugin } from './plugin';

const createPlugin = ({ escalationsEnabled = true }: { escalationsEnabled?: boolean } = {}) =>
  new AgenticInvestigationsPublicPlugin(
    coreMock.createPluginInitializerContext({ escalations: { enabled: escalationsEnabled } })
  );

describe('AgenticInvestigationsPublicPlugin conversation template UI registration', () => {
  it('registers the investigation and escalation template UI and their tabs', () => {
    const agentBuilder = agentBuilderMocks.createStart();

    createPlugin().start(coreMock.createStart(), { agentBuilder });

    const { conversationTemplates } = agentBuilder;
    expect(conversationTemplates.registerTemplateUIDefinition).toHaveBeenCalledTimes(2);
    expect(conversationTemplates.registerTemplateUIDefinition).toHaveBeenCalledWith(
      'investigation',
      expect.any(Function)
    );
    expect(conversationTemplates.registerTemplateUIDefinition).toHaveBeenCalledWith(
      'escalation',
      expect.any(Function)
    );
    for (const tabId of [
      ...getInvestigationTabIds('investigation'),
      ...getEscalationTabIds('escalation'),
    ]) {
      expect(conversationTemplates.registerTab).toHaveBeenCalledWith(tabId, expect.any(Function));
    }
  });

  it('registers the shared template names and icons', () => {
    const agentBuilder = agentBuilderMocks.createStart();

    createPlugin().start(coreMock.createStart(), { agentBuilder });

    const definitions = Object.fromEntries(
      agentBuilder.conversationTemplates.registerTemplateUIDefinition.mock.calls.map(
        ([templateId, factory]) => [
          templateId,
          factory({ openFullscreenConversation: jest.fn() } as never),
        ]
      )
    );
    expect(definitions.investigation).toEqual(
      expect.objectContaining({ name: 'Investigation', icon: 'magnifyExclamation' })
    );
    expect(definitions.escalation).toEqual(
      expect.objectContaining({ name: 'Escalation', icon: 'warning' })
    );
  });

  it('registers the impact, subject, and hypotheses attachment renderers', () => {
    const agentBuilder = agentBuilderMocks.createStart();

    createPlugin().start(coreMock.createStart(), { agentBuilder });

    const types = agentBuilder.attachments.addAttachmentType.mock.calls.map(([type]) => type);
    expect(types).toEqual([
      'investigation_impact',
      'investigation_subject',
      'investigation_hypotheses',
    ]);
  });

  it('registers nothing without Agent Builder, and still offers the investigation card', () => {
    const plugin = createPlugin();

    expect(plugin.start(coreMock.createStart(), {}).InvestigationCard).toEqual(
      expect.any(Function)
    );
  });

  it('registers only the investigation template, without an escalate action, when escalations are disabled', () => {
    const agentBuilder = agentBuilderMocks.createStart();

    createPlugin({ escalationsEnabled: false }).start(coreMock.createStart(), { agentBuilder });

    const { conversationTemplates } = agentBuilder;
    expect(conversationTemplates.registerTemplateUIDefinition).toHaveBeenCalledTimes(1);
    expect(conversationTemplates.registerTemplateUIDefinition).toHaveBeenCalledWith(
      'investigation',
      expect.any(Function)
    );
    for (const tabId of getEscalationTabIds('escalation')) {
      expect(conversationTemplates.registerTab).not.toHaveBeenCalledWith(
        tabId,
        expect.any(Function)
      );
    }
  });
});
