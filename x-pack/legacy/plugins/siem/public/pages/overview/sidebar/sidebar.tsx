/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { Filters } from '../../../components/recent_timelines/filters';
import { ENABLE_NEWS_FEED_SETTING, NEWS_FEED_URL_SETTING } from '../../../../common/constants';
import { StatefulRecentTimelines } from '../../../components/recent_timelines';
import { StatefulNewsFeed } from '../../../components/news_feed';
import { FilterMode } from '../../../components/recent_timelines/types';
import { SidebarHeader } from '../../../components/sidebar_header';
import { useApolloClient } from '../../../utils/apollo_context';

import * as i18n from '../translations';

const SidebarFlexGroup = styled(EuiFlexGroup)`
  width: 305px;
`;

export const Sidebar = React.memo<{
  filterBy: FilterMode;
  setFilterBy: (filterBy: FilterMode) => void;
}>(({ filterBy, setFilterBy }) => {
  const apolloClient = useApolloClient();
  const RecentTimelinesFilters = useMemo(
    () => <Filters filterBy={filterBy} setFilterBy={setFilterBy} />,
    [filterBy, setFilterBy]
  );

  return (
    <SidebarFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <SidebarHeader title={i18n.RECENT_TIMELINES}>{RecentTimelinesFilters}</SidebarHeader>
        <StatefulRecentTimelines apolloClient={apolloClient!} filterBy={filterBy} />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiSpacer size="xxl" />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <StatefulNewsFeed
          enableNewsFeedSetting={ENABLE_NEWS_FEED_SETTING}
          newsFeedSetting={NEWS_FEED_URL_SETTING}
        />
      </EuiFlexItem>
    </SidebarFlexGroup>
  );
});

Sidebar.displayName = 'Sidebar';
