/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLink,
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';
import React from 'react';

import { isUntitled } from '../../open_timeline/helpers';
import { OnOpenTimeline, OpenTimelineResult } from '../../open_timeline/types';

import * as i18n from '../translations';

export interface MeApiResponse {
  username: string;
}

export const RecentTimelineHeader = React.memo<{
  onOpenTimeline: OnOpenTimeline;
  timeline: OpenTimelineResult;
}>(({ onOpenTimeline, timeline }) => {
  const { title, savedObjectId } = timeline;

  return (
    <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <EuiLink
            onClick={() => onOpenTimeline({ duplicate: false, timelineId: `${savedObjectId}` })}
          >
            {isUntitled(timeline) ? i18n.UNTITLED_TIMELINE : title}
          </EuiLink>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={i18n.OPEN_AS_DUPLICATE}>
          <EuiButtonIcon
            aria-label={i18n.OPEN_AS_DUPLICATE}
            data-test-subj="open-duplicate"
            isDisabled={savedObjectId == null}
            iconSize="s"
            iconType="copy"
            onClick={() =>
              onOpenTimeline({
                duplicate: true,
                timelineId: `${savedObjectId}`,
              })
            }
            size="s"
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

RecentTimelineHeader.displayName = 'RecentTimelineHeader';
