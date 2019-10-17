/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';

import { EuiTabs, EuiTab } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/target/types/react';

function hasSearch(profileResponse: any[]) {
  const aggs = _.get(profileResponse, '[0].searches', []);
  return aggs.length > 0;
}

function hasAggregations(profileResponse: any[]) {
  const aggs = _.get(profileResponse, '[0].aggregations', []);
  return aggs.length > 0;
}

function handleClick(activateTab: (tabName: string) => void, tabName: string) {
  activateTab(tabName);
}

interface Props {
  activeTab: {
    search: boolean;
    aggregations: any;
  };
  activateTab: (tabName: string) => void;
  profileResponse: any[];
}

export const SearchProfilerTabs = (props: Props) => {
  return (
    <EuiTabs>
      <EuiTab
        isSelected={props.activeTab.search}
        disabled={!hasSearch(props.profileResponse)}
        onClick={() => handleClick(props.activateTab, 'search')}
      >
        <FormattedMessage
          id="xpack.searchProfiler.queryProfileTabTitle"
          defaultMessage="Query Profile"
        />
      </EuiTab>
      <EuiTab
        isSelected={props.activeTab.aggregations}
        disabled={!hasAggregations(props.profileResponse)}
        onClick={() => handleClick(props.activateTab, 'aggregations')}
      >
        <FormattedMessage
          id="xpack.searchProfiler.aggregationProfileTabTitle"
          defaultMessage="Aggregation Profile"
        />
      </EuiTab>
    </EuiTabs>
  );
};
