/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState } from 'react';
import {
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

import { DeprecationInfo } from 'src/legacy/core_plugins/elasticsearch';
import { GroupByOption, LevelFilterOption, LoadingState } from '../../types';
import { FilterBar } from './filter_bar';
import { GroupByBar } from './group_by_bar';

import { validateRegExpString } from '../../../utils';

interface CheckupControlsProps extends ReactIntl.InjectedIntlProps {
  allDeprecations?: DeprecationInfo[];
  loadingState: LoadingState;
  loadData: () => void;
  currentFilter: LevelFilterOption;
  onFilterChange: (filter: LevelFilterOption) => void;
  onSearchChange: (filter: string) => void;
  availableGroupByOptions: GroupByOption[];
  currentGroupBy: GroupByOption;
  onGroupByChange: (groupBy: GroupByOption) => void;
}

export const CheckupControlsUI: FunctionComponent<CheckupControlsProps> = ({
  allDeprecations,
  loadingState,
  loadData,
  currentFilter,
  onFilterChange,
  search,
  onSearchChange,
  availableGroupByOptions,
  currentGroupBy,
  onGroupByChange,
  intl,
}) => {
  const [searchTermError, setSearchTermError] = useState<null | string>(null);
  return (
    <EuiFlexGroup alignItems="center" wrap={true} responsive={false}>
      <EuiFlexItem grow={true}>
        <EuiFieldSearch
          aria-label="Filter"
          placeholder={intl.formatMessage({
            id: 'xpack.upgradeAssistant.checkupTab.controls.searchBarPlaceholder',
            defaultMessage: 'Filter',
          })}
          onChange={e => {
            const string = e.target.value;
            const errorMessage = validateRegExpString(string);
            if (!errorMessage) {
              if (searchTermError) {
                setSearchTermError(null);
              }
              onSearchChange(e.target.value);
            } else {
              setSearchTermError(errorMessage);
            }
          }}
        />
        <EuiSpacer size="s" />
        <EuiText size="s" color="danger">
          {searchTermError}
        </EuiText>
      </EuiFlexItem>

      {/* These two components provide their own EuiFlexItem wrappers */}
      <FilterBar {...{ allDeprecations, currentFilter, onFilterChange }} />
      <GroupByBar {...{ availableGroupByOptions, currentGroupBy, onGroupByChange }} />

      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          onClick={loadData}
          iconType="refresh"
          isLoading={loadingState === LoadingState.Loading}
        >
          <FormattedMessage
            id="xpack.upgradeAssistant.checkupTab.controls.refreshButtonLabel"
            defaultMessage="Refresh"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const CheckupControls = injectI18n(CheckupControlsUI);
