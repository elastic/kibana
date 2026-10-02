/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import {
  registerAgenticInvestigationTemplateUI,
  registerEscalationTemplateUI,
} from '@kbn/agentic-investigations-common';
import type { ProposalsPublicPluginStart } from '@kbn/proposals-plugin/public';
import { escalationTemplate } from '../templates/escalation/register';
import { investigationTemplate } from '../templates/investigation/register';
import { registerTemplate } from './register_template';

jest.mock('@kbn/agentic-investigations-common', () => ({
  ...jest.requireActual('@kbn/agentic-investigations-common'),
  registerAgenticInvestigationTemplateUI: jest.fn(),
  registerEscalationTemplateUI: jest.fn(),
}));

const mockRegisterInvestigation = registerAgenticInvestigationTemplateUI as jest.Mock;
const mockRegisterEscalation = registerEscalationTemplateUI as jest.Mock;

const register = ({
  capabilities = {},
  proposals,
}: {
  capabilities?: Record<string, boolean>;
  proposals?: ProposalsPublicPluginStart;
} = {}) => {
  const core = coreMock.createStart();
  core.application.capabilities = {
    ...core.application.capabilities,
    agenticInvestigations: capabilities,
  };
  registerTemplate({
    core,
    startDeps: { agentBuilder: agentBuilderMocks.createStart(), proposals },
    templates: [investigationTemplate, escalationTemplate],
  });
  return {
    investigation: mockRegisterInvestigation.mock.calls[0][0],
    escalation: mockRegisterEscalation.mock.calls[0][0],
  };
};

describe('registerTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers both templates with the shared names and icons', () => {
    const { investigation, escalation } = register();

    expect(investigation).toEqual(
      expect.objectContaining({
        templateId: 'investigation',
        name: 'Investigation',
        icon: 'magnifyExclamation',
      })
    );
    expect(escalation).toEqual(
      expect.objectContaining({ templateId: 'escalation', name: 'Escalation', icon: 'warning' })
    );
  });

  it('renders only read-only slots without the agentic investigations capabilities', () => {
    const { investigation, escalation } = register();

    expect(investigation.renderAssignees).toEqual(expect.any(Function));
    expect(investigation.renderStatus).toBeUndefined();
    expect(investigation.renderCloseInvestigationModal).toBeUndefined();
    expect(investigation.renderEscalationModal).toBeUndefined();
    expect(escalation.renderAssignees).toEqual(expect.any(Function));
    expect(escalation.renderStatus).toBeUndefined();
    expect(escalation.renderLinkedInvestigations).toBeUndefined();
  });

  it('enables the investigation write actions with manageInvestigations', () => {
    const { investigation, escalation } = register({
      capabilities: { manageInvestigations: true },
    });

    expect(investigation.renderStatus).toEqual(expect.any(Function));
    expect(investigation.renderCloseInvestigationModal).toEqual(expect.any(Function));
    expect(investigation.renderEscalationModal).toBeUndefined();
    // Closing an escalation needs manageEscalations too.
    expect(escalation.renderStatus).toBeUndefined();
  });

  it('enables the escalation actions with the escalation capabilities', () => {
    const { investigation, escalation } = register({
      capabilities: {
        manageInvestigations: true,
        manageEscalations: true,
        showEscalations: true,
      },
    });

    expect(investigation.renderEscalationModal).toEqual(expect.any(Function));
    expect(escalation.renderStatus).toEqual(expect.any(Function));
    expect(escalation.renderLinkedInvestigations).toEqual(expect.any(Function));
  });

  it('renders proposed actions only when the proposals plugin is enabled', () => {
    expect(register().investigation.renderProposedActions).toBeUndefined();

    jest.clearAllMocks();

    expect(register({ proposals: {} }).investigation.renderProposedActions).toEqual(
      expect.any(Function)
    );
  });
});
