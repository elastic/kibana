/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EventLinksProvider, EventMarkdown, parseEventHref, toEventHref } from './event_markdown';

jest.mock(
  '../conversation_templates/templates/investigation/flyout/use_is_in_agent_builder',
  () => ({
    useIsInAgentBuilder: () => false,
  })
);
jest.mock('../conversation_templates/templates/investigation/flyout/impact_map_events', () => ({
  ImpactMapEventsFlyout: ({ initialEventId }: { initialEventId?: string }) => (
    <div data-test-subj="eventsFlyout">{initialEventId}</div>
  ),
  resolveEventsSelection: (selection: { id: string }) => ({
    title: 't',
    events: [],
    initialEventId: selection.id,
  }),
}));

const ID = 'condition:frontend:2026-11-08T15:45';
const impactMap = {
  entities: [],
  relationships: [],
  entity_types: [],
  events: [{ id: ID }],
} as never;

describe('event links', () => {
  it('moves the id into a relative path and back', () => {
    const href = toEventHref(`[x](event:${ID})`).match(/\((.*)\)/)?.[1];
    expect(parseEventHref(href)).toBe(ID);
  });

  it('opens the event a link names', () => {
    render(
      <EventLinksProvider impactMap={impactMap}>
        <EventMarkdown text={`It [lost replicas](event:${ID}) at once.`} />
      </EventLinksProvider>
    );
    fireEvent.click(screen.getByText('lost replicas'));
    expect(screen.getByTestId('eventsFlyout')).toHaveTextContent(ID);
  });

  it('shows an unknown event as plain words', () => {
    render(
      <EventLinksProvider impactMap={impactMap}>
        <EventMarkdown text="It [lost replicas](event:failure:other:2026-11-08T15:45) at once." />
      </EventLinksProvider>
    );
    expect(screen.getByText(/lost replicas/)).toBeInTheDocument();
    expect(screen.queryByTestId('agenticInvestigationsEventLink')).toBeNull();
  });
});
