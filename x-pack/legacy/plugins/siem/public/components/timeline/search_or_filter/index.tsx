/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '@kbn/es-query';
import { getOr, isEqual } from 'lodash/fp';
import React, { useCallback } from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { StaticIndexPattern } from 'ui/index_patterns';

import { BrowserFields } from '../../../containers/source';
import { convertKueryToElasticSearchQuery } from '../../../lib/keury';
import {
  KueryFilterQuery,
  SerializedFilterQuery,
  State,
  timelineSelectors,
  inputsModel,
  inputsSelectors,
} from '../../../store';
import { timelineActions } from '../../../store/actions';
import { KqlMode, TimelineModel } from '../../../store/timeline/model';
import { DispatchUpdateReduxTime, dispatchUpdateReduxTime } from '../../super_date_picker';
import { DataProvider } from '../data_providers/data_provider';
import { SearchOrFilter } from './search_or_filter';

interface OwnProps {
  browserFields: BrowserFields;
  indexPattern: StaticIndexPattern;
  timelineId: string;
}

interface StateReduxProps {
  dataProviders: DataProvider[];
  filters: Filter[];
  filterQuery: KueryFilterQuery;
  filterQueryDraft: KueryFilterQuery;
  from: number;
  fromStr: string;
  kqlMode?: KqlMode;
  savedQueryId: string | null;
  to: number;
  toStr: string;
}

interface DispatchProps {
  applyKqlFilterQuery: ({
    id,
    filterQuery,
  }: {
    id: string;
    filterQuery: SerializedFilterQuery;
  }) => void;
  updateKqlMode: ({ id, kqlMode }: { id: string; kqlMode: KqlMode }) => void;
  setKqlFilterQueryDraft: ({
    id,
    filterQueryDraft,
  }: {
    id: string;
    filterQueryDraft: KueryFilterQuery;
  }) => void;
  setSavedQueryId: ({ id, savedQueryId }: { id: string; savedQueryId: string | null }) => void;
  setFilters: ({ id, filters }: { id: string; filters: Filter[] }) => void;
  updateReduxTime: DispatchUpdateReduxTime;
}

type Props = OwnProps & StateReduxProps & DispatchProps;

const StatefulSearchOrFilterComponent = React.memo<Props>(
  ({
    applyKqlFilterQuery,
    browserFields,
    dataProviders,
    filters,
    filterQuery,
    filterQueryDraft,
    from,
    fromStr,
    indexPattern,
    kqlMode,
    savedQueryId,
    setFilters,
    setKqlFilterQueryDraft,
    setSavedQueryId,
    timelineId,
    to,
    toStr,
    updateKqlMode,
    updateReduxTime,
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
      (newSavedQueryId: string | null) =>
        setSavedQueryId({
          id: timelineId,
          savedQueryId: newSavedQueryId,
        }),
      [timelineId]
    );

    return (
      <SearchOrFilter
        applyKqlFilterQuery={applyFilterQueryFromKueryExpression}
        browserFields={browserFields}
        dataProviders={dataProviders}
        filters={filters}
        filterQuery={filterQuery}
        filterQueryDraft={filterQueryDraft}
        from={from}
        fromStr={fromStr}
        indexPattern={indexPattern}
        kqlMode={kqlMode!}
        savedQueryId={savedQueryId}
        setFilters={setFiltersInTimeline}
        setKqlFilterQueryDraft={setFilterQueryDraftFromKueryExpression!}
        setSavedQueryId={setSavedQueryInTimeline}
        timelineId={timelineId}
        to={to}
        toStr={toStr}
        updateKqlMode={updateKqlMode!}
        updateReduxTime={updateReduxTime}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      isEqual(prevProps.browserFields, nextProps.browserFields) &&
      isEqual(prevProps.dataProviders, nextProps.dataProviders) &&
      isEqual(prevProps.filters, nextProps.filters) &&
      isEqual(prevProps.filterQuery, nextProps.filterQuery) &&
      isEqual(prevProps.filterQueryDraft, nextProps.filterQueryDraft) &&
      isEqual(prevProps.indexPattern, nextProps.indexPattern) &&
      isEqual(prevProps.kqlMode, nextProps.kqlMode) &&
      isEqual(prevProps.savedQueryId, nextProps.savedQueryId) &&
      isEqual(prevProps.timelineId, nextProps.timelineId)
    );
  }
);
StatefulSearchOrFilterComponent.displayName = 'StatefulSearchOrFilterComponent';

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getKqlFilterQueryDraft = timelineSelectors.getKqlFilterQueryDraftSelector();
  const getKqlFilterQuery = timelineSelectors.getKqlFilterKuerySelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId);
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    return {
      dataProviders: timeline.dataProviders,
      filterQuery: getKqlFilterQuery(state, timelineId),
      filterQueryDraft: getKqlFilterQueryDraft(state, timelineId),
      filters: timeline.filters,
      from: input.timerange.from,
      fromStr: input.timerange.fromStr,
      kqlMode: getOr('filter', 'kqlMode', timeline),
      savedQueryId: getOr(null, 'savedQueryId', timeline),
      to: input.timerange.to,
      toStr: input.timerange.toStr,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  applyKqlFilterQuery: ({ id, filterQuery }: { id: string; filterQuery: SerializedFilterQuery }) =>
    dispatch(
      timelineActions.applyKqlFilterQuery({
        id,
        filterQuery,
      })
    ),
  updateKqlMode: ({ id, kqlMode }: { id: string; kqlMode: KqlMode }) =>
    dispatch(timelineActions.updateKqlMode({ id, kqlMode })),
  setKqlFilterQueryDraft: ({
    id,
    filterQueryDraft,
  }: {
    id: string;
    filterQueryDraft: KueryFilterQuery;
  }) =>
    dispatch(
      timelineActions.setKqlFilterQueryDraft({
        id,
        filterQueryDraft,
      })
    ),
  setSavedQueryId: ({ id, savedQueryId }: { id: string; savedQueryId: string | null }) =>
    dispatch(timelineActions.setSavedQueryId({ id, savedQueryId })),
  setFilters: ({ id, filters }: { id: string; filters: Filter[] }) =>
    dispatch(timelineActions.setFilters({ id, filters })),
  updateReduxTime: dispatchUpdateReduxTime(dispatch),
});

export const StatefulSearchOrFilter = connect(
  makeMapStateToProps,
  mapDispatchToProps
)(StatefulSearchOrFilterComponent);
