/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { getPinnedEventCount, getNotesCount } from '../../open_timeline/helpers';
import { OpenTimelineResult } from '../../open_timeline/types';

import * as i18n from '../translations';

const Icon = styled(EuiIcon)`
  margin-right: 8px;
`;

const FlexGroup = styled(EuiFlexGroup)`
  margin-right: 16px;
`;

const IconWithCount = React.memo<{ count: number; icon: string; tooltip: string }>(
  ({ count, icon, tooltip }) => (
    <EuiToolTip content={tooltip}>
      <FlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <Icon color="subdued" size="s" type={icon} />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            {count}
          </EuiText>
        </EuiFlexItem>
      </FlexGroup>
    </EuiToolTip>
  )
);

IconWithCount.displayName = 'IconWithCount';

export const RecentTimelineCounts = React.memo<{
  timeline: OpenTimelineResult;
}>(({ timeline }) => {
  return (
    <div>
      <IconWithCount
        count={getPinnedEventCount(timeline)}
        icon="pinFilled"
        tooltip={i18n.PINNED_EVENTS}
      />
      <IconWithCount count={getNotesCount(timeline)} icon="editorComment" tooltip={i18n.NOTES} />
    </div>
  );
});

RecentTimelineCounts.displayName = 'RecentTimelineCounts';
