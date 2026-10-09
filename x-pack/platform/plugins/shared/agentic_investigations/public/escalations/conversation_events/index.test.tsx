/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { applicationServiceMock } from '@kbn/core/public/mocks';
import {
  ESCALATION_ATTACHMENTS_SYNCED_EVENT_TYPE,
  ESCALATION_CREATED_FROM_INVESTIGATION_EVENT_TYPE,
  ESCALATION_INVESTIGATION_LINKED_EVENT_TYPE,
} from '../../../common/escalations/conversation_events';
import { createEscalationConversationEventUiDefinitions } from '.';

jest.mock('@kbn/agent-builder-plugin/public', () => ({ AGENTBUILDER_APP_ID: 'agent_builder' }));

const setup = (index: 0 | 1 | 2, data: object) => {
  const application = applicationServiceMock.createStartContract();
  application.getUrlForApp.mockImplementation((appId, { path } = {}) => `/app/${appId}${path}`);
  const definition = createEscalationConversationEventUiDefinitions({ application })[index];
  const event = { id: 'e1', type: definition.type, data } as never;
  const ctx = { conversationId: 'esc-1' };
  render(<I18nProvider>{definition.render(event, ctx)}</I18nProvider>);
  return { application, definition };
};

const data = { investigation_id: 'inv 1', title: 'Phishing', agent_id: 'agent-1' };

describe('escalation conversation event UI definitions', () => {
  it('renders the "created from" text with a link to the investigation conversation', () => {
    setup(0, data);

    expect(screen.getByTestId('escalationCreatedFromInvestigationEvent')).toHaveTextContent(
      'New escalation created from Phishing'
    );
    expect(screen.getByTestId('escalationEventInvestigationLink')).toHaveAttribute(
      'href',
      '/app/agent_builder/agents/agent-1/conversations/inv%201?openConversationDetails=true'
    );
  });

  it('renders the "linked" text', () => {
    setup(1, data);

    expect(screen.getByTestId('escalationInvestigationLinkedEvent')).toHaveTextContent(
      'Phishing has been linked to this escalation'
    );
  });

  it('falls back to the agent-less conversation route', () => {
    setup(1, { investigation_id: 'inv-1', title: 'Phishing' });

    expect(screen.getByTestId('escalationEventInvestigationLink')).toHaveAttribute(
      'href',
      '/app/agent_builder/conversations/inv-1?openConversationDetails=true'
    );
  });

  it('navigates in-app on a plain click', () => {
    const { application } = setup(0, data);

    fireEvent.click(screen.getByTestId('escalationEventInvestigationLink'));

    expect(application.navigateToApp).toHaveBeenCalledWith('agent_builder', {
      path: '/agents/agent-1/conversations/inv%201?openConversationDetails=true',
    });
  });

  it('leaves modified clicks to the browser', () => {
    const { application } = setup(0, data);

    fireEvent.click(screen.getByTestId('escalationEventInvestigationLink'), { metaKey: true });

    expect(application.navigateToApp).not.toHaveBeenCalled();
  });

  it('renders how many attachments were synced from the investigation', () => {
    setup(2, { ...data, attachment_ids: ['inv 1:a', 'inv 1:b'] });

    expect(screen.getByTestId('escalationAttachmentsSyncedEvent')).toHaveTextContent(
      '2 attachments were synced from Phishing'
    );
    expect(screen.getByTestId('escalationEventInvestigationLink')).toBeInTheDocument();
  });

  it('uses the singular for one synced attachment', () => {
    setup(2, { ...data, attachment_ids: ['inv 1:a'] });

    expect(screen.getByTestId('escalationAttachmentsSyncedEvent')).toHaveTextContent(
      '1 attachment was synced from Phishing'
    );
  });

  it('registers all types with a header', () => {
    const application = applicationServiceMock.createStartContract();
    const [a, b, c] = createEscalationConversationEventUiDefinitions({ application });

    expect([a.type, b.type, c.type]).toEqual([
      ESCALATION_CREATED_FROM_INVESTIGATION_EVENT_TYPE,
      ESCALATION_INVESTIGATION_LINKED_EVENT_TYPE,
      ESCALATION_ATTACHMENTS_SYNCED_EVENT_TYPE,
    ]);
    expect(a.getHeader?.({} as never, { conversationId: 'x' })?.icon).toBeDefined();
  });
});
