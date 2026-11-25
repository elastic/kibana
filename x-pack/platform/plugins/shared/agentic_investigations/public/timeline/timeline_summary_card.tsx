/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InvestigationImpactMapResponse } from '../../common';
import { selectTimelineSummary } from '../../common';
import { TimelineSummary } from './timeline_summary';
import { useOpenTimeline } from './use_timeline_flyout';

/**
 * The summary timeline with its "View all" link, which opens the big timeline in a flyout. Nothing
 * when the investigation has fewer than two key events to show.
 */
export const TimelineSummaryCard: React.FC<{
  impactMap: InvestigationImpactMapResponse;
  onOpenEvent: (eventId: string) => void;
}> = ({ impactMap, onOpenEvent }) => {
  const openTimeline = useOpenTimeline();
  const data = useMemo(
    () =>
      selectTimelineSummary({
        events: impactMap.events,
        relationships: impactMap.relationships,
        timeline: impactMap.timeline,
      }),
    [impactMap.events, impactMap.relationships, impactMap.timeline]
  );
  if (!data) {
    return null;
  }
  return (
    <div data-test-subj="agenticInvestigationsTimelineCard">
      <TimelineSummary
        data={data}
        impactMap={impactMap}
        onOpenEvent={onOpenEvent}
        // The whole timeline opens with no filters, on the first of the events that were hidden.
        onOpenHidden={(hiddenEventIds) =>
          openTimeline?.({ entityIds: [], eventId: hiddenEventIds[0] })
        }
      />
    </div>
  );
};

/**
 * "View full timeline", for the Timeline heading's row: the same button as the cards' "Open",
 * blue with a hover highlight. It opens the whole timeline in a flyout.
 */
export const ViewFullTimelineButton: React.FC = () => {
  const openTimeline = useOpenTimeline();
  return (
    <EuiButtonEmpty
      size="xs"
      iconType="timeline"
      iconSide="right"
      onClick={() => openTimeline?.({ entityIds: [] })}
      data-test-subj="agenticInvestigationsTimelineViewAll"
    >
      {i18n.translate('xpack.agenticInvestigations.timelineSummary.viewFullTimeline', {
        defaultMessage: 'View full timeline',
      })}
    </EuiButtonEmpty>
  );
};
