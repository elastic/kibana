/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';

import { EuiTabs, EuiTab } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { Targets } from '../types';

export interface Props {
  activeTab: Targets | null;
  activateTab: (target: Targets) => void;
  has: {
    searches: boolean;
    aggregations: boolean;
  };
}

export const SearchProfilerTabs = ({ activeTab, activateTab, has }: Props) => {
  return (
    <EuiTabs>
      <EuiTab
        isSelected={activeTab === 'searches'}
        disabled={!has.searches}
        onClick={() => activateTab('searches')}
      >
        <FormattedMessage
          id="xpack.searchProfiler.queryProfileTabTitle"
          defaultMessage="Query Profile"
        />
      </EuiTab>
      <EuiTab
        isSelected={activeTab === 'aggregations'}
        disabled={!has.aggregations}
        onClick={() => activateTab('aggregations')}
      >
        <FormattedMessage
          id="xpack.searchProfiler.aggregationProfileTabTitle"
          defaultMessage="Aggregation Profile"
        />
      </EuiTab>
    </EuiTabs>
  );
};
