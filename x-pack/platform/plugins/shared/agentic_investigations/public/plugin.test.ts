/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock } from '@kbn/core/public/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import {
  FlyoutGroupedAttachments,
  getEscalationTabIds,
  getInvestigationTabIds,
  renderImpactDetails,
} from '@kbn/agentic-investigations-common';
import type { AgenticInvestigationsPublicSetupDependencies } from './types';
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

  it('registers nothing without Agent Builder', () => {
    const plugin = createPlugin();

    expect(() => plugin.start(coreMock.createStart(), {})).not.toThrow();
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

  it('reads the entity opener when the overview renders, including one registered after start', () => {
    const agentBuilder = agentBuilderMocks.createStart();
    const { registerImpactEntityOpener } = createPlugin().start(coreMock.createStart(), {
      agentBuilder,
    });
    const open = jest.fn();
    registerImpactEntityOpener(open);

    const view = renderImpactDetails({
      id: 'impact-1',
      spaceId: 'default',
      conversationId: 'conv-1',
      createdAt: '2026-09-01T00:00:00.000Z',
      entities: [{ id: 'user:cfo@corp', name: 'cfo@corp', type: 'user' }],
    });

    render(React.createElement(EuiProvider, null, React.createElement(I18nProvider, null, view)));

    fireEvent.click(screen.getByTestId('investigationImpactEntityFlyout'));

    expect(open).toHaveBeenCalledWith({ id: 'user:cfo@corp', name: 'cfo@corp', type: 'user' });
  });

  it('exposes a registration that the investigation overview reads from', () => {
    const plugin = createPlugin();
    const workflowsExtensions = {
      registerStepDefinition: jest.fn(),
    } as unknown as AgenticInvestigationsPublicSetupDependencies['workflowsExtensions'];
    const renderer = () => null;

    const { registerFlyoutGroupedAttachment } = plugin.setup(coreMock.createSetup(), {
      workflowsExtensions,
    });
    registerFlyoutGroupedAttachment(FlyoutGroupedAttachments.RULES, ['security.rule'], renderer);

    expect(() =>
      registerFlyoutGroupedAttachment(FlyoutGroupedAttachments.RULES, ['security.rule'], renderer)
    ).toThrow('already registered');
  });
});
