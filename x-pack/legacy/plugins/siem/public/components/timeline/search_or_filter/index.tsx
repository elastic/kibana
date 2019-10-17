/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '@kbn/es-query';
import { getOr, isEqual } from 'lodash/fp';
import React, { useCallback } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import { StaticIndexPattern } from 'ui/index_patterns';

import { SavedQuery } from '../../../../../../../../src/legacy/core_plugins/data/public';
import { convertKueryToElasticSearchQuery } from '../../../lib/keury';
import { KueryFilterQuery, SerializedFilterQuery, State, timelineSelectors } from '../../../store';

import { SearchOrFilter } from './search_or_filter';
import { timelineActions } from '../../../store/actions';
import { KqlMode, TimelineModel } from '../../../store/timeline/model';

interface OwnProps {
  indexPattern: StaticIndexPattern;
  timelineId: string;
}

interface StateReduxProps {
  filters: Filter[];
  filterQueryDraft: KueryFilterQuery;
  kqlMode?: KqlMode;
  savedQuery: SavedQuery | null;
}

interface DispatchProps {
  applyKqlFilterQuery: ActionCreator<{
    id: string;
    filterQuery: SerializedFilterQuery;
  }>;
  updateKqlMode: ActionCreator<{
    id: string;
    kqlMode: KqlMode;
  }>;
  setKqlFilterQueryDraft: ActionCreator<{
    id: string;
    filterQueryDraft: KueryFilterQuery;
  }>;
  setSavedQuery: ActionCreator<{
    id: string;
    savedQuery: SavedQuery | null;
  }>;
  setFilters: ActionCreator<{
    id: string;
    filters: Filter[];
  }>;
}

type Props = OwnProps & StateReduxProps & DispatchProps;

const StatefulSearchOrFilterComponent = React.memo<Props>(
  ({
    applyKqlFilterQuery,
    filters,
    filterQueryDraft,
    indexPattern,
    kqlMode,
    savedQuery,
    setFilters,
    setKqlFilterQueryDraft,
    setSavedQuery,
    timelineId,
    updateKqlMode,
  }) => {
    const applyFilterQueryFromKueryExpression = useCallback(
      (expression: string, kind) =>
        applyKqlFilterQuery({
          id: timelineId,
          filterQuery: {
            kuery: {
              kind,
              expression,
            },
            serializedQuery: convertKueryToElasticSearchQuery(expression, indexPattern),
          },
        }),
      [indexPattern, timelineId]
    );

    const setFilterQueryDraftFromKueryExpression = useCallback(
      (expression: string, kind) =>
        setKqlFilterQueryDraft({
          id: timelineId,
          filterQueryDraft: {
            kind,
            expression,
          },
        }),
      [timelineId]
    );

    const setFiltersInTimeline = useCallback(
      (newFilters: Filter[]) =>
        setFilters({
          id: timelineId,
          filters: newFilters,
        }),
      [timelineId]
    );

    const setSavedQueryInTimeline = useCallback(
      (newSavedQuery: SavedQuery | null) =>
        setSavedQuery({
          id: timelineId,
          savedQuery: newSavedQuery,
        }),
      [timelineId]
    );

    return (
      <SearchOrFilter
        applyKqlFilterQuery={applyFilterQueryFromKueryExpression}
        filters={filters}
        filterQueryDraft={filterQueryDraft}
        indexPattern={indexPattern}
        kqlMode={kqlMode!}
        savedQuery={savedQuery}
        setFilters={setFiltersInTimeline}
        setKqlFilterQueryDraft={setFilterQueryDraftFromKueryExpression!}
        setSavedQuery={setSavedQueryInTimeline}
        timelineId={timelineId}
        updateKqlMode={updateKqlMode!}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      isEqual(prevProps.filters, nextProps.filters) &&
      isEqual(prevProps.filterQueryDraft, nextProps.filterQueryDraft) &&
      isEqual(prevProps.indexPattern, nextProps.indexPattern) &&
      isEqual(prevProps.kqlMode, nextProps.kqlMode) &&
      isEqual(prevProps.savedQuery, nextProps.savedQuery) &&
      isEqual(prevProps.timelineId, nextProps.timelineId)
    );
  }
);
StatefulSearchOrFilterComponent.displayName = 'StatefulSearchOrFilterComponent';

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getKqlFilterQueryDraft = timelineSelectors.getKqlFilterQueryDraftSelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel | {} = getTimeline(state, timelineId);
    return {
      filterQueryDraft: getKqlFilterQueryDraft(state, timelineId),
      filters: getOr([], 'filters', timeline),
      kqlMode: getOr('filter', 'kqlMode', timeline),
      savedQuery: getOr(null, 'savedQuery', timeline),
    };
  };
  return mapStateToProps;
};

export const StatefulSearchOrFilter = connect(
  makeMapStateToProps,
  {
    applyKqlFilterQuery: timelineActions.applyKqlFilterQuery,
    setKqlFilterQueryDraft: timelineActions.setKqlFilterQueryDraft,
    setFilters: timelineActions.setFilters,
    setSavedQuery: timelineActions.setSavedQuery,
    updateKqlMode: timelineActions.updateKqlMode,
  }
)(StatefulSearchOrFilterComponent);
