/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect, EuiToolTip } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import * as React from 'react';
import { pure } from 'recompose';
import styled, { injectGlobal } from 'styled-components';
import { StaticIndexPattern } from 'ui/index_patterns';

import { SavedQuery } from '../../../../../../../../src/legacy/core_plugins/data/public';
import { KueryFilterQuery, KueryFilterQueryKind } from '../../../store';
import { KqlMode } from '../../../store/timeline/model';
import { QueryBarTimeline } from '../query_bar';

import { modes, options } from './helpers';
import * as i18n from './translations';

const timelineSelectModeItemsClassName = 'timelineSelectModeItemsClassName';
const searchOrFilterPopoverClassName = 'searchOrFilterPopover';
const searchOrFilterPopoverWidth = '352px';

// SIDE EFFECT: the following creates a global class selector
// eslint-disable-next-line no-unused-expressions
injectGlobal`
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
  filterQueryDraft: KueryFilterQuery;
  indexPattern: StaticIndexPattern;
  kqlMode: KqlMode;
  timelineId: string;
  updateKqlMode: ({ id, kqlMode }: { id: string; kqlMode: KqlMode }) => void;
  setFilters: (filters: Filter[]) => void;
  setKqlFilterQueryDraft: (expression: string, kind: KueryFilterQueryKind) => void;
  setSavedQuery: (savedQuery: SavedQuery | null) => void;
  filters: Filter[];
  savedQuery: SavedQuery | null;
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
    indexPattern,
    filters,
    filterQueryDraft,
    kqlMode,
    timelineId,
    savedQuery,
    setFilters,
    setKqlFilterQueryDraft,
    setSavedQuery,
    updateKqlMode,
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
          <EuiToolTip content={modes[kqlMode].kqlBarTooltip}>
            <QueryBarTimeline
              applyKqlFilterQuery={applyKqlFilterQuery}
              filters={filters}
              filterQueryDraft={filterQueryDraft}
              indexPattern={indexPattern}
              savedQuery={savedQuery}
              setFilters={setFilters}
              setKqlFilterQueryDraft={setKqlFilterQueryDraft}
              setSavedQuery={setSavedQuery}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </SearchOrFilterContainer>
  )
);

SearchOrFilter.displayName = 'SearchOrFilter';
