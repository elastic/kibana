/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EventCard } from '../impact_map/attachments/impact_map_cards';
import { useEventLinks } from './event_markdown';

const EVENT_ID = /\]\(event:([^)\s]*)\)/;

/**
 * The card of the first event the text links to: the event that backs what the text says, shown
 * where it is read. Nothing when the text links no event, or the record does not hold it.
 */
export const LinkedEventCard: React.FC<{ text: string }> = ({ text }) => {
  const links = useEventLinks();
  const id = EVENT_ID.exec(text.replace(/\\n/g, '\n'))?.[1];
  const event = id ? links?.impactMap.events.find((candidate) => candidate.id === id) : undefined;
  if (!links || !event) {
    return null;
  }
  return (
    <EventCard
      event={event}
      impactMap={links.impactMap}
      onOpen={() => links.openEvent(event.id)}
      onOpenEntity={links.openEntity}
    />
  );
};

/** The newest root cause event as a card, the same one the Overview shows under its conclusion. */
export const RootCauseEventCard: React.FC = () => {
  const links = useEventLinks();
  const event = links?.impactMap.events
    .filter(({ kind }) => kind === 'root_cause')
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
  if (!links || !event) {
    return null;
  }
  return (
    <EventCard
      event={event}
      impactMap={links.impactMap}
      onOpen={() => links.openEvent(event.id)}
      onOpenEntity={links.openEntity}
    />
  );
};
