/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  ConversationActivityEventType,
  EventActorType,
  type ConversationEvent,
} from '@kbn/agent-builder-common';
import { EventSentence } from './event_sentence';
import { toActivityItems } from './to_activity_items';

const activityEvent = (type: ConversationActivityEventType, data: object): ConversationEvent => ({
  id: 'event-1',
  type,
  data,
  created_at: '2026-06-01T10:00:00Z',
  actor: { type: EventActorType.user, id: 'alex' },
});

const participants = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    type: 'user' as const,
    id: `user-${index}`,
    role: ConversationAccessControlRole.Member,
  }));

const renderSentence = (event: ConversationEvent) => {
  const [activity] = toActivityItems([event]);

  return render(
    <IntlProvider locale="en">
      <EuiThemeProvider>
        <EventSentence event={activity} actor="Alex Kim" />
      </EuiThemeProvider>
    </IntlProvider>
  );
};

describe('EventSentence user count', () => {
  it.each([
    [ConversationActivityEventType.participantsAdded, 'added'],
    [ConversationActivityEventType.participantsRemoved, 'removed'],
  ])('highlights the whole count in a %s sentence', (type, verb) => {
    const { container } = renderSentence(activityEvent(type, { participants: participants(3) }));

    expect(container).toHaveTextContent(`Alex Kim ${verb} 3 users`);
    expect(screen.getByText('3 users')).toBeInTheDocument();
  });

  it('uses the singular for one user', () => {
    const { container } = renderSentence(
      activityEvent(ConversationActivityEventType.participantsAdded, {
        participants: participants(1),
      })
    );

    expect(container).toHaveTextContent('Alex Kim added 1 user');
    expect(screen.getByText('1 user')).toBeInTheDocument();
  });

  it('styles the count like the other highlighted values', () => {
    renderSentence(
      activityEvent(ConversationActivityEventType.participantsAdded, {
        participants: participants(3),
      })
    );
    const count = screen.getByText('3 users');
    const actor = screen.getByText('Alex Kim');

    expect(count.className).toBe(actor.className);
  });

  it('leaves the verb outside the highlight', () => {
    renderSentence(
      activityEvent(ConversationActivityEventType.participantsAdded, {
        participants: participants(3),
      })
    );

    expect(screen.getByText('added').className).not.toBe(screen.getByText('3 users').className);
  });

  it('highlights the visibility values the same way', () => {
    renderSentence(
      activityEvent(ConversationActivityEventType.visibilityUpdated, {
        previous_access_mode: ConversationAccessControlMode.Private,
        access_mode: ConversationAccessControlMode.Public,
      })
    );

    expect(screen.getByText('Private').className).toBe(screen.getByText('Alex Kim').className);
  });
});
