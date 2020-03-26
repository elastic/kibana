/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText, EuiLink } from '@elastic/eui';
import React, { useCallback } from 'react';

import { isUntitled } from '../../open_timeline/helpers';
import { OnOpenTimeline, OpenTimelineResult } from '../../open_timeline/types';
import * as i18n from '../translations';

export const RecentTimelineHeader = React.memo<{
  onOpenTimeline: OnOpenTimeline;
  timeline: OpenTimelineResult;
}>(({ onOpenTimeline, timeline, timeline: { title, savedObjectId } }) => {
  const onClick = useCallback(
    () => onOpenTimeline({ duplicate: false, timelineId: `${savedObjectId}` }),
    [onOpenTimeline, savedObjectId]
  );

  return (
    <EuiText size="s">
      <EuiLink onClick={onClick}>{isUntitled(timeline) ? i18n.UNTITLED_TIMELINE : title}</EuiLink>
    </EuiText>
  );
});

RecentTimelineHeader.displayName = 'RecentTimelineHeader';
