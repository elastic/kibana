/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { AnalyticsServiceStart } from '@kbn/core/public';

import { EventTracker } from './event_tracker';

const EventTrackerContext = createContext<EventTracker | null>(null);

export interface EventTrackerProviderProps {
  children: React.ReactNode | React.ReactNode[];
  analytics: AnalyticsServiceStart;
}

export const EventTrackerProvider = ({ children, analytics }: EventTrackerProviderProps) => {
  const tracker = useMemo(() => new EventTracker(analytics), [analytics]);
  return <EventTrackerContext.Provider value={tracker}>{children}</EventTrackerContext.Provider>;
};

export const useEventTracker = (): EventTracker => {
  const tracker = useContext(EventTrackerContext);
  if (!tracker) {
    throw new Error('useEventTracker must be used inside an EventTrackerProvider');
  }
  return tracker;
};
