/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '@kbn/es-query';
import { getOr, isEqual } from 'lodash/fp';
import React, { memo, useEffect } from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { Subscription } from 'rxjs';
import styled from 'styled-components';
import { StaticIndexPattern, IndexPattern } from 'ui/index_patterns';

import { TimeRange, Query } from 'src/plugins/data/common/types';
import { SavedQuery } from 'src/legacy/core_plugins/data/public';

import { start as data } from '../../../../../../../src/legacy/core_plugins/data/public/legacy';

import { inputsActions } from '../../store/inputs';
import { InputsRange } from '../../store/inputs/model';
import { InputsModelId } from '../../store/inputs/constants';
import { State, inputsModel } from '../../store';
import { dispatchUpdateReduxTime, DispatchUpdateReduxTime, formatDate } from '../super_date_picker';
import {
  endSelector,
  filterQuerySelector,
  fromStrSelector,
  isLoadingSelector,
  kindSelector,
  queriesSelector,
  savedQuerySelector,
  startSelector,
  toStrSelector,
} from './selectors';

const {
  ui: { SearchBar },
  filter,
  search,
  timefilter,
} = data;

export const siemFilterManager = filter.filterManager;
export const savedQueryService = search.services.savedQueryService;

interface SiemSearchBarRedux {
  end: number;
  fromStr: string;
  isLoading: boolean;
  queries: inputsModel.GlobalGraphqlQuery[];
  filterQuery: Query;
  savedQuery?: SavedQuery;
  start: number;
  toStr: string;
}

interface SiemSearchBarDispatch {
  updateReduxTime: DispatchUpdateReduxTime;
  setFilterQuery: ({
    id,
    query,
    language,
  }: {
    id: InputsModelId;
    query: string | { [key: string]: unknown };
    language: string;
  }) => void;
  setSavedQuery: ({
    id,
    savedQuery,
  }: {
    id: InputsModelId;
    savedQuery: SavedQuery | undefined;
  }) => void;
  setSearchBarFilter: ({ id, filters }: { id: InputsModelId; filters: Filter[] }) => void;
}

interface SiemSearchBarProps {
  id: InputsModelId;
  indexPattern: StaticIndexPattern;
  timelineId?: string;
}

const SearchBarContainer = styled.div`
  .globalQueryBar {
    padding: 0px;
  }
`;

const SearchBarComponent = memo<SiemSearchBarProps & SiemSearchBarRedux & SiemSearchBarDispatch>(
  ({
    end,
    filterQuery,
    fromStr,
    id,
    indexPattern,
    isLoading = false,
    queries,
    savedQuery,
    setFilterQuery,
    setSavedQuery,
    setSearchBarFilter,
    start,
    timelineId,
    toStr,
    updateReduxTime,
  }) => {
    if (fromStr != null && toStr != null) {
      timefilter.timefilter.setTime({ from: fromStr, to: toStr });
    } else if (start != null && end != null) {
      timefilter.timefilter.setTime({
        from: new Date(start).toISOString(),
        to: new Date(end).toISOString(),
      });
    }

    const onQuerySubmit = (payload: { dateRange: TimeRange; query?: Query }) => {
      const isQuickSelection =
        payload.dateRange.from.includes('now') || payload.dateRange.to.includes('now');
      if (
        (isQuickSelection &&
          (fromStr !== payload.dateRange.from || toStr !== payload.dateRange.to)) ||
        (!isQuickSelection &&
          (start !== formatDate(payload.dateRange.from) ||
            end !== formatDate(payload.dateRange.to)))
      ) {
        updateReduxTime({
          end: payload.dateRange.to,
          id,
          isInvalid: false,
          isQuickSelection,
          kql: undefined,
          start: payload.dateRange.from,
          timelineId,
        });
      }

      if (payload.query != null && !isEqual(payload.query, filterQuery)) {
        setFilterQuery({
          id,
          ...payload.query,
        });
      }
    };

    const onRefresh = (payload: { dateRange: TimeRange }) => {
      if (payload.dateRange.from.includes('now') || payload.dateRange.to.includes('now')) {
        updateReduxTime({
          end: payload.dateRange.to,
          id,
          isInvalid: false,
          isQuickSelection: true,
          kql: undefined,
          start: payload.dateRange.from,
          timelineId,
        });
      } else {
        queries.forEach(q => q.refetch && (q.refetch as inputsModel.Refetch)());
      }
    };

    const onSavedQueryUpdated = (savedQueryUpdated: SavedQuery) => {
      siemFilterManager.setFilters(savedQueryUpdated.attributes.filters || []);

      const isQuickSelection = savedQueryUpdated.attributes.timefilter
        ? savedQueryUpdated.attributes.timefilter.from.includes('now') ||
          savedQueryUpdated.attributes.timefilter.to.includes('now')
        : false;

      updateReduxTime({
        end: savedQueryUpdated.attributes.timefilter
          ? savedQueryUpdated.attributes.timefilter.to
          : toStr,
        id,
        isInvalid: false,
        isQuickSelection,
        kql: undefined,
        start: savedQueryUpdated.attributes.timefilter
          ? savedQueryUpdated.attributes.timefilter.from
          : fromStr,
        timelineId,
      });

      setFilterQuery({
        id,
        ...savedQueryUpdated.attributes.query,
      });
      setSavedQuery({ id, savedQuery: savedQueryUpdated });
    };

    const onClearSavedQuery = () => {
      if (savedQuery != null) {
        setFilterQuery({
          id,
          query: '',
          language: savedQuery.attributes.query.language,
        });
        setSavedQuery({ id, savedQuery: undefined });
        siemFilterManager.setFilters([]);
      }
    };

    useEffect(() => {
      let isSubscribed = true;
      const subscriptions = new Subscription();

      subscriptions.add(
        siemFilterManager.getUpdates$().subscribe({
          next: () => {
            if (isSubscribed) {
              setSearchBarFilter({
                id,
                filters: siemFilterManager.getFilters(),
              });
            }
          },
        })
      );

      return () => {
        isSubscribed = false;
        subscriptions.unsubscribe();
      };
    }, []);

    return (
      <SearchBarContainer data-test-subj={`${id}DatePicker`}>
        <SearchBar
          appName="siem"
          isLoading={isLoading}
          indexPatterns={[indexPattern as IndexPattern]}
          query={filterQuery}
          onClearSavedQuery={onClearSavedQuery}
          onQuerySubmit={onQuerySubmit}
          onRefresh={onRefresh}
          onSavedQueryUpdated={onSavedQueryUpdated}
          savedQuery={savedQuery}
          showFilterBar={true}
          showDatePicker={true}
          showQueryBar={true}
          showQueryInput={true}
          showSaveQuery={true}
        />
      </SearchBarContainer>
    );
  }
);

const makeMapStateToProps = () => {
  const getEndSelector = endSelector();
  const getFromStrSelector = fromStrSelector();
  const getIsLoadingSelector = isLoadingSelector();
  const getKindSelector = kindSelector();
  const getQueriesSelector = queriesSelector();
  const getStartSelector = startSelector();
  const getToStrSelector = toStrSelector();
  const getFilterQuerySelector = filterQuerySelector();
  const getSavedQuerySelector = savedQuerySelector();
  return (state: State, { id }: SiemSearchBarProps) => {
    const inputsRange: InputsRange = getOr({}, `inputs.${id}`, state);
    return {
      end: getEndSelector(inputsRange),
      fromStr: getFromStrSelector(inputsRange),
      filterQuery: getFilterQuerySelector(inputsRange),
      isLoading: getIsLoadingSelector(inputsRange),
      kind: getKindSelector(inputsRange),
      queries: getQueriesSelector(inputsRange),
      savedQuery: getSavedQuerySelector(inputsRange),
      start: getStartSelector(inputsRange),
      toStr: getToStrSelector(inputsRange),
    };
  };
};

SearchBarComponent.displayName = 'SiemSearchBarComponent';

const mapDispatchToProps = (dispatch: Dispatch) => ({
  updateReduxTime: dispatchUpdateReduxTime(dispatch),
  setFilterQuery: ({
    id,
    query,
    language,
  }: {
    id: InputsModelId;
    query: string | { [key: string]: unknown };
    language: string;
  }) => dispatch(inputsActions.setFilterQuery({ id, query, language })),
  setSavedQuery: ({ id, savedQuery }: { id: InputsModelId; savedQuery: SavedQuery | undefined }) =>
    dispatch(inputsActions.setSavedQuery({ id, savedQuery })),
  setSearchBarFilter: ({ id, filters }: { id: InputsModelId; filters: Filter[] }) =>
    dispatch(inputsActions.setSearchBarFilter({ id, filters })),
});

export const SiemSearchBar = connect(
  makeMapStateToProps,
  mapDispatchToProps
)(SearchBarComponent);
