/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { InvestigationImpactMapResponse } from '../../common';
import {
  takeTimelineEventFocus,
  takeTimelineFlyoutOpen,
  takeTimelineFocus,
} from '../conversation_templates/templates/investigation/flyout/timeline_focus';
import { useEventLinks } from '../event_links/event_markdown';
import { TimelineExpandedFlyout, type TimelineFocus } from './timeline_expanded';

/** Opens the timeline flyout; with a focus it starts on those entities or that event. */
export type OpenTimeline = (focus?: TimelineFocus) => void;

const TimelineOpenContext = createContext<OpenTimeline | undefined>(undefined);

/** The opener of the nearest timeline flyout, for the summary and for any "view in timeline". */
export const useOpenTimeline = (): OpenTimeline | undefined => useContext(TimelineOpenContext);

/**
 * Owns the timeline flyout of one investigation. It opens from the summary's link, from an
 * event's or an entity's "View in timeline", and from a chat card that asked for it before the
 * investigation was on screen.
 */
export const TimelineFlyoutHost: React.FC<
  React.PropsWithChildren<{
    conversationId: string;
    impactMap: InvestigationImpactMapResponse | undefined;
    /** Receives the opener, for callers that open it from outside the tree. */
    onReady?: (open: OpenTimeline) => void;
  }>
> = ({ conversationId, impactMap, onReady, children }) => {
  const links = useEventLinks();
  const [focus, setFocus] = useState<TimelineFocus | null>(null);
  const open = useCallback<OpenTimeline>(
    (next) =>
      setFocus(
        next ?? {
          // Whatever a "View in timeline" left for it: entities to filter by, or an event to mark.
          entityIds: takeTimelineFocus(conversationId),
          eventId: takeTimelineEventFocus(conversationId),
        }
      ),
    [conversationId]
  );
  useEffect(() => {
    onReady?.(open);
  }, [onReady, open]);
  // A chat card led here before the investigation was shown.
  useEffect(() => {
    if (takeTimelineFlyoutOpen(conversationId)) {
      setFocus({ entityIds: [] });
    }
  }, [conversationId]);

  return (
    <TimelineOpenContext.Provider value={open}>
      {children}
      {impactMap && focus && (
        <TimelineExpandedFlyout
          impactMap={impactMap}
          focus={focus}
          // The entity's flyout opens over the timeline, as it does from anywhere else.
          onOpenEntity={(entityId) => links?.openEntity(entityId)}
          onClose={() => setFocus(null)}
        />
      )}
    </TimelineOpenContext.Provider>
  );
};
