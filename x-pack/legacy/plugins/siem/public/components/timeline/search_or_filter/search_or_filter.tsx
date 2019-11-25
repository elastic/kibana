/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect, EuiToolTip } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled, { createGlobalStyle } from 'styled-components';
import { StaticIndexPattern } from 'ui/index_patterns';

import { esFilters } from '../../../../../../../../src/plugins/data/public';
import { BrowserFields } from '../../../containers/source';
import { KueryFilterQuery, KueryFilterQueryKind } from '../../../store';
import { KqlMode } from '../../../store/timeline/model';
import { DataProvider } from '../data_providers/data_provider';
import { QueryBarTimeline } from '../query_bar';

import { options } from './helpers';
import * as i18n from './translations';
import { DispatchUpdateReduxTime } from '../../super_date_picker';

const timelineSelectModeItemsClassName = 'timelineSelectModeItemsClassName';
const searchOrFilterPopoverClassName = 'searchOrFilterPopover';
const searchOrFilterPopoverWidth = '352px';

// SIDE EFFECT: the following creates a global class selector
// eslint-disable-next-line no-unused-expressions
createGlobalStyle`
  .${timelineSelectModeItemsClassName} {
    width: 350px !important;
  }

  .${searchOrFilterPopoverClassName}__popoverPanel {
    width: ${searchOrFilterPopoverWidth};

    .euiSuperSelect__listbox {
      width: ${searchOrFilterPopoverWidth} !important;
    }
  }
`;

interface Props {
  applyKqlFilterQuery: (expression: string, kind: KueryFilterQueryKind) => void;
  browserFields: BrowserFields;
  dataProviders: DataProvider[];
  filterQuery: KueryFilterQuery;
  filterQueryDraft: KueryFilterQuery;
  from: number;
  fromStr: string;
  indexPattern: StaticIndexPattern;
  isRefreshPaused: boolean;
  kqlMode: KqlMode;
  timelineId: string;
  updateKqlMode: ({ id, kqlMode }: { id: string; kqlMode: KqlMode }) => void;
  refreshInterval: number;
  setFilters: (filters: esFilters.Filter[]) => void;
  setKqlFilterQueryDraft: (expression: string, kind: KueryFilterQueryKind) => void;
  setSavedQueryId: (savedQueryId: string | null) => void;
  filters: esFilters.Filter[];
  savedQueryId: string | null;
  to: number;
  toStr: string;
  updateReduxTime: DispatchUpdateReduxTime;
}

const SearchOrFilterContainer = styled.div`
  margin: 5px 0 10px 0;
  user-select: none;
  .globalQueryBar {
    padding: 0px;
    .kbnQueryBar {
      div:first-child {
        margin-right: 0px;
      }
    }
  }
`;

SearchOrFilterContainer.displayName = 'SearchOrFilterContainer';

const ModeFlexItem = styled(EuiFlexItem)`
  user-select: none;
`;

ModeFlexItem.displayName = 'ModeFlexItem';

export const SearchOrFilter = pure<Props>(
  ({
    applyKqlFilterQuery,
    browserFields,
    dataProviders,
    indexPattern,
    isRefreshPaused,
    filters,
    filterQuery,
    filterQueryDraft,
    from,
    fromStr,
    kqlMode,
    timelineId,
    refreshInterval,
    savedQueryId,
    setFilters,
    setKqlFilterQueryDraft,
    setSavedQueryId,
    to,
    toStr,
    updateKqlMode,
    updateReduxTime,
  }) => (
    <SearchOrFilterContainer>
      <EuiFlexGroup data-test-subj="timeline-search-or-filter" gutterSize="xs">
        <ModeFlexItem grow={false}>
          <EuiToolTip content={i18n.FILTER_OR_SEARCH_WITH_KQL}>
            <EuiSuperSelect
              data-test-subj="timeline-select-search-or-filter"
              hasDividers={true}
              itemLayoutAlign="top"
              itemClassName={timelineSelectModeItemsClassName}
              onChange={(mode: KqlMode) => updateKqlMode({ id: timelineId, kqlMode: mode })}
              options={options}
              popoverClassName={searchOrFilterPopoverClassName}
              valueOfSelected={kqlMode}
            />
          </EuiToolTip>
        </ModeFlexItem>
        <EuiFlexItem data-test-subj="timeline-search-or-filter-search-container">
          <QueryBarTimeline
            applyKqlFilterQuery={applyKqlFilterQuery}
            browserFields={browserFields}
            dataProviders={dataProviders}
            filters={filters}
            filterQuery={filterQuery}
            filterQueryDraft={filterQueryDraft}
            from={from}
            fromStr={fromStr}
            kqlMode={kqlMode}
            indexPattern={indexPattern}
            isRefreshPaused={isRefreshPaused}
            refreshInterval={refreshInterval}
            savedQueryId={savedQueryId}
            setFilters={setFilters}
            setKqlFilterQueryDraft={setKqlFilterQueryDraft}
            setSavedQueryId={setSavedQueryId}
            timelineId={timelineId}
            to={to}
            toStr={toStr}
            updateReduxTime={updateReduxTime}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </SearchOrFilterContainer>
  )
);

SearchOrFilter.displayName = 'SearchOrFilter';
