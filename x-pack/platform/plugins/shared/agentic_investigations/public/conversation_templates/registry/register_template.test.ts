/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import {
  registerAgenticInvestigationTemplateUI,
  registerEscalationTemplateUI,
} from '@kbn/agentic-investigations-common';
import type { ProposalsPublicPluginStart } from '@kbn/proposals-plugin/public';
import { escalationTemplate } from '../templates/escalation/register';
import { investigationTemplate } from '../templates/investigation/register';
import { resetInvestigationsPrivilegesCache } from '../../investigations/hooks/use_can_manage_investigations';
import { registerTemplate } from './register_template';

jest.mock('@kbn/agentic-investigations-common', () => ({
  ...jest.requireActual('@kbn/agentic-investigations-common'),
  registerAgenticInvestigationTemplateUI: jest.fn(),
  registerEscalationTemplateUI: jest.fn(),
}));

const mockRegisterInvestigation = registerAgenticInvestigationTemplateUI as jest.Mock;
const mockRegisterEscalation = registerEscalationTemplateUI as jest.Mock;

const register = ({
  proposals,
  core = coreMock.createStart(),
}: {
  proposals?: ProposalsPublicPluginStart;
  core?: ReturnType<typeof coreMock.createStart>;
} = {}) => {
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
    resetInvestigationsPrivilegesCache();
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

  it('registers every write slot without the UI capabilities, so they can decide at render time', () => {
    // A user can hold the API privileges through another feature, which the privileges probe
    // reports only after `start`, so registration does not depend on the UI capabilities.
    const { investigation, escalation } = register();

    expect(investigation.renderAssignees).toEqual(expect.any(Function));
    expect(investigation.renderStatus).toEqual(expect.any(Function));
    expect(investigation.renderCloseInvestigationModal).toEqual(expect.any(Function));
    expect(investigation.renderEscalationModal).toEqual(expect.any(Function));
    expect(investigation.wrapEscalationButton).toEqual(expect.any(Function));
    expect(escalation.renderAssignees).toEqual(expect.any(Function));
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

  describe('the escalation button without the UI capability', () => {
    const renderButton = (manageEscalations: boolean) => {
      const core = coreMock.createStart();
      core.http.get.mockResolvedValue({
        investigations: { read: true, manage: true },
        escalations: { read: manageEscalations, manage: manageEscalations },
      });
      const { investigation } = register({ core });
      render(
        React.createElement(
          React.Fragment,
          null,
          investigation.wrapEscalationButton(
            React.createElement('button', { type: 'button' }, 'Open escalation')
          )
        )
      );
      return core;
    };

    it('shows the button when the probe reports the escalations manage privilege', async () => {
      const core = renderButton(true);

      expect(await screen.findByRole('button', { name: 'Open escalation' })).toBeInTheDocument();
      expect(core.http.get).toHaveBeenCalledWith('/internal/investigations/_privileges', {
        version: '1',
      });
    });

    it('hides the button when the probe reports no escalations manage privilege', async () => {
      const core = renderButton(false);

      await waitFor(() => expect(core.http.get).toHaveBeenCalled());
      expect(screen.queryByRole('button', { name: 'Open escalation' })).not.toBeInTheDocument();
    });
  });
});
