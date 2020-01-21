/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';

import { RecentTimelineHeader } from './header';
import { OnOpenTimeline, OpenTimelineResult } from '../open_timeline/types';

import { RecentTimelineCounts } from './counts';

export interface MeApiResponse {
  username: string;
}

export const RecentTimelines = React.memo<{
  noTimelinesMessage: string;
  onOpenTimeline: OnOpenTimeline;
  timelines: OpenTimelineResult[];
}>(({ noTimelinesMessage, onOpenTimeline, timelines }) => {
  if (timelines.length === 0) {
    return (
      <>
        <EuiText color="subdued" size="s">
          {noTimelinesMessage}
        </EuiText>
      </>
    );
  }

  return (
    <>
      {timelines.map((t, i) => (
        <div key={`${t.savedObjectId}-${i}`}>
          <RecentTimelineHeader onOpenTimeline={onOpenTimeline} timeline={t} />
          <RecentTimelineCounts timeline={t} />
          {t.description && t.description.length && (
            <>
              <EuiSpacer size="s" />
              <EuiText color="subdued" size="xs">
                {t.description}
              </EuiText>
            </>
          )}
          {i !== timelines.length - 1 && <EuiSpacer size="l" />}
        </div>
      ))}
    </>
  );
});

RecentTimelines.displayName = 'RecentTimelines';
