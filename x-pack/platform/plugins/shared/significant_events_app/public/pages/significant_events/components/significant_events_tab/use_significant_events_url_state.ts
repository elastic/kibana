/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useSignificantEventsAppParams } from '../../../../hooks/use_significant_events_app_params';
import { useSignificantEventsAppRouter } from '../../../../hooks/use_significant_events_app_router';

type TabQuery = ReturnType<typeof useSignificantEventsAppParams<'/{tab}'>>['query'];

const omitSelectedEvent = (query: TabQuery): Omit<TabQuery, 'selectedEvent'> => {
  const { selectedEvent, ...rest } = query ?? {};
  return rest;
};

/**
 * URL state for the significant events tab.
 *
 * - `selectedEvent`: deep-link context (e.g. from a notification). Filters the list to just
 *   that event and adapts the filter controls to its properties.
 * - `openEvent`: the single source of truth for flyout visibility — the flyout is open iff
 *   this param is present. Deep-link arrival normalizes `openEvent = selectedEvent` so the
 *   flyout opens; closing the flyout removes `openEvent` while keeping `selectedEvent`.
 */
export const useSignificantEventsUrlState = () => {
  const router = useSignificantEventsAppRouter();
  const { query } = useSignificantEventsAppParams('/{tab}');

  const queryRef = useRef(query);
  queryRef.current = query;

  const selectedEventId = query?.selectedEvent;
  const openEventId = query?.openEvent;

  const openEvent = useCallback(
    (eventId: string) => {
      router.push('/{tab}', {
        path: { tab: 'significant_events' },
        query: { ...(queryRef.current ?? {}), openEvent: eventId },
      });
    },
    [router]
  );

  const closeEvent = useCallback(() => {
    const { openEvent: _, ...rest } = queryRef.current ?? {};
    router.push('/{tab}', {
      path: { tab: 'significant_events' },
      query: rest,
    });
  }, [router]);

  // replace (not push): clearing is often triggered per keystroke from the search bar, and a
  // history entry per keystroke would make the back button restore the cleared selection.
  // Keep openEvent so a filter/search edit does not close the flyout while the event is still
  // in the list. A later fetch that drops the event clears openEvent separately.
  const clearSelectedEvent = useCallback(() => {
    router.replace('/{tab}', {
      path: { tab: 'significant_events' },
      query: omitSelectedEvent(queryRef.current),
    });
  }, [router]);

  const toggleEvent = useCallback(
    (eventId: string) => {
      if (queryRef.current?.openEvent === eventId) {
        closeEvent();
      } else {
        openEvent(eventId);
      }
    },
    [openEvent, closeEvent]
  );

  // Deep-link arrival: open the flyout by normalizing openEvent = selectedEvent. Runs once per
  // selectedEvent value so closing the flyout (which removes openEvent) is not undone.
  const normalizedForRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!selectedEventId || normalizedForRef.current === selectedEventId) {
      return;
    }
    normalizedForRef.current = selectedEventId;
    if (!queryRef.current?.openEvent) {
      router.replace('/{tab}', {
        path: { tab: 'significant_events' },
        query: { ...(queryRef.current ?? {}), openEvent: selectedEventId },
      });
    }
  }, [selectedEventId, router]);

  return { selectedEventId, openEventId, openEvent, closeEvent, clearSelectedEvent, toggleEvent };
};
