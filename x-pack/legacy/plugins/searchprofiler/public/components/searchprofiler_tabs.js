/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiTabs,
  EuiTab
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

function hasSearch(profileResponse) {
  const aggs = _.get(profileResponse, '[0].searches', []);
  return aggs.length > 0;
}

function hasAggregations(profileResponse) {
  const aggs = _.get(profileResponse, '[0].aggregations', []);
  return aggs.length > 0;
}


function handleClick(activateTab, tabName) {
  activateTab(tabName);
}

export function SearchProfilerTabs(props) {
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
}

SearchProfilerTabs.propTypes = {
  activeTab: PropTypes.any.isRequired,
  activateTab: PropTypes.func.isRequired,
  profileResponse: PropTypes.array.isRequired,
};
