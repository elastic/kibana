/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TimelineSlotRenderProps } from '@kbn/agentic-investigations-common';
import { useInvestigation } from '../../../../investigations/hooks/use_investigation';
import {
  EventSummary,
  ImpactMapEventsFlyout,
  describeEventTarget,
  resolveEventsSelection,
} from './impact_map_events';

const EMPTY_TITLE = i18n.translate('xpack.agenticInvestigations.timeline.emptyTitle', {
  defaultMessage: 'Nothing on the timeline yet',
});
const EMPTY_BODY = i18n.translate('xpack.agenticInvestigations.timeline.emptyBody', {
  defaultMessage:
    'Changes, failures, alerts and what responders did appear here in the order they happened.',
});

/**
 * The Timeline tab: every event of the investigation, oldest first, including responder actions
 * that belong to no entity. An event opens its detail in a child flyout.
 */
export const TimelineTab: React.FC<TimelineSlotRenderProps> = ({ conversationId }) => {
  const { data, isLoading } = useInvestigation(conversationId);
  const [selectedId, setSelectedId] = useState<string>();

  if (isLoading) {
    return <EuiSkeletonText lines={4} />;
  }

  const impactMap = data?.impact_map;
  const events = impactMap?.events ?? [];
  if (!impactMap || events.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj="agenticInvestigationsTimelineEmpty"
        iconType="clock"
        title={<h3>{EMPTY_TITLE}</h3>}
        titleSize="xs"
        body={<p>{EMPTY_BODY}</p>}
      />
    );
  }

  return (
    <>
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        data-test-subj="agenticInvestigationsTimeline"
      >
        {events.map((event) => (
          <EuiFlexItem key={event.id} grow={false}>
            <EventSummary
              event={event}
              target={describeEventTarget(event, impactMap)}
              onClick={() => setSelectedId(event.id)}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {selectedId && (
        <ImpactMapEventsFlyout
          key={selectedId}
          {...resolveEventsSelection({ kind: 'event', id: selectedId }, impactMap)}
          impactMap={impactMap}
          onClose={() => setSelectedId(undefined)}
        />
      )}
    </>
  );
};
