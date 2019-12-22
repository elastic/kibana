/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, isEqual } from 'lodash/fp';
import React, { useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Dispatch } from 'redux';

import { esFilters, IIndexPattern } from '../../../../../../../../src/plugins/data/public';
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
import { KqlMode, timelineDefaults, TimelineModel } from '../../../store/timeline/model';
import { dispatchUpdateReduxTime } from '../../super_date_picker';
import { SearchOrFilter } from './search_or_filter';

interface OwnProps {
  browserFields: BrowserFields;
  indexPattern: IIndexPattern;
  timelineId: string;
}

type Props = OwnProps & StatefulSearchOrFilterReduxProps;

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
    isRefreshPaused,
    kqlMode,
    refreshInterval,
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
      (newFilters: esFilters.Filter[]) =>
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
        isRefreshPaused={isRefreshPaused}
        kqlMode={kqlMode!}
        refreshInterval={refreshInterval}
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
      prevProps.from === nextProps.from &&
      prevProps.fromStr === nextProps.fromStr &&
      prevProps.to === nextProps.to &&
      prevProps.toStr === nextProps.toStr &&
      prevProps.isRefreshPaused === nextProps.isRefreshPaused &&
      prevProps.refreshInterval === nextProps.refreshInterval &&
      prevProps.timelineId === nextProps.timelineId &&
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
  const getInputsPolicy = inputsSelectors.getTimelinePolicySelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const policy: inputsModel.Policy = getInputsPolicy(state);
    return {
      dataProviders: timeline.dataProviders,
      filterQuery: getKqlFilterQuery(state, timelineId)!,
      filterQueryDraft: getKqlFilterQueryDraft(state, timelineId)!,
      filters: timeline.filters!,
      from: input.timerange.from,
      fromStr: input.timerange.fromStr!,
      isRefreshPaused: policy.kind === 'manual',
      kqlMode: getOr('filter', 'kqlMode', timeline),
      refreshInterval: policy.duration,
      savedQueryId: getOr(null, 'savedQueryId', timeline),
      to: input.timerange.to,
      toStr: input.timerange.toStr!,
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
  setFilters: ({ id, filters }: { id: string; filters: esFilters.Filter[] }) =>
    dispatch(timelineActions.setFilters({ id, filters })),
  updateReduxTime: dispatchUpdateReduxTime(dispatch),
});

export const connector = connect(makeMapStateToProps, mapDispatchToProps);

type StatefulSearchOrFilterReduxProps = ConnectedProps<typeof connector>;

export const StatefulSearchOrFilter = connector(StatefulSearchOrFilterComponent);
