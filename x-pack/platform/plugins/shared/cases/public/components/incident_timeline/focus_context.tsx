/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';

export const INCIDENT_TIMELINE_PANEL_ID = 'cases-incident-timeline-panel';

export interface EntryFocusRequest {
  readonly entryId: string;
  readonly intent: 'show' | 'edit';
}

interface IncidentTimelineFocus {
  /** What an Activity row asked the panel to do; cleared once the panel handled it. */
  request?: EntryFocusRequest;
  focusEntry: (request: EntryFocusRequest) => void;
  clearRequest: () => void;
}

const IncidentTimelineFocusContext = createContext<IncidentTimelineFocus | undefined>(undefined);

/** Lets an Activity row reach the incident timeline panel above the tabs. */
export const IncidentTimelineFocusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [request, setRequest] = useState<EntryFocusRequest | undefined>();
  const value = useMemo(
    () => ({
      request,
      focusEntry: (next: EntryFocusRequest) => {
        setRequest(next);
        document
          .getElementById(INCIDENT_TIMELINE_PANEL_ID)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      clearRequest: () => setRequest(undefined),
    }),
    [request]
  );
  return (
    <IncidentTimelineFocusContext.Provider value={value}>
      {children}
    </IncidentTimelineFocusContext.Provider>
  );
};

export const useIncidentTimelineFocus = (): IncidentTimelineFocus | undefined =>
  useContext(IncidentTimelineFocusContext);

IncidentTimelineFocusProvider.displayName = 'IncidentTimelineFocusProvider';
