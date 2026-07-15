/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef } from 'react';
import { useStreamsAppParams } from '../../../../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../../../../hooks/use_streams_app_router';

export const useSignificantEventsUrlState = () => {
  const router = useStreamsAppRouter();
  const { query } = useStreamsAppParams('/_discovery/{tab}');

  const queryRef = useRef(query);
  queryRef.current = query;

  const selectedEventId = query?.selectedEvent;

  const openEvent = useCallback(
    (eventId: string) => {
      const q = queryRef.current;
      router.push('/_discovery/{tab}', {
        path: { tab: 'significant_events' },
        query: {
          ...(q?.rangeFrom ? { rangeFrom: q.rangeFrom } : {}),
          ...(q?.rangeTo ? { rangeTo: q.rangeTo } : {}),
          selectedEvent: eventId,
        },
      });
    },
    [router]
  );

  const closeEvent = useCallback(() => {
    const q = queryRef.current;
    router.push('/_discovery/{tab}', {
      path: { tab: 'significant_events' },
      query: {
        ...(q?.rangeFrom ? { rangeFrom: q.rangeFrom } : {}),
        ...(q?.rangeTo ? { rangeTo: q.rangeTo } : {}),
      },
    });
  }, [router]);

  return { selectedEventId, openEvent, closeEvent };
};
