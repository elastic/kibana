/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, isEqual, set } from 'lodash/fp';
import React, { memo, useEffect, useCallback, useMemo } from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { Subscription } from 'rxjs';
import styled from 'styled-components';
import { StaticIndexPattern, IndexPattern } from 'ui/index_patterns';
import { SavedQuery } from 'src/legacy/core_plugins/data/public';

import { OnTimeChangeProps } from '@elastic/eui';
import { npStart } from 'ui/new_platform';
import { start as data } from '../../../../../../../src/legacy/core_plugins/data/public/legacy';

import { inputsActions } from '../../store/inputs';
import { InputsRange } from '../../store/inputs/model';
import { InputsModelId } from '../../store/inputs/constants';
import { State, inputsModel } from '../../store';
import { formatDate } from '../super_date_picker';
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
import { timelineActions, hostsActions, networkActions } from '../../store/actions';
import { TimeRange, Query, esFilters } from '../../../../../../../src/plugins/data/public';

const {
  ui: { SearchBar },
  search,
} = data;

export const siemFilterManager = npStart.plugins.data.query.filterManager;
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
  updateSearch: DispatchUpdateSearch;
  setSavedQuery: ({
    id,
    savedQuery,
  }: {
    id: InputsModelId;
    savedQuery: SavedQuery | undefined;
  }) => void;
  setSearchBarFilter: ({ id, filters }: { id: InputsModelId; filters: esFilters.Filter[] }) => void;
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
    setSavedQuery,
    setSearchBarFilter,
    start,
    timelineId,
    toStr,
    updateSearch,
  }) => {
    const { timefilter } = npStart.plugins.data.query.timefilter;
    if (fromStr != null && toStr != null) {
      timefilter.setTime({ from: fromStr, to: toStr });
    } else if (start != null && end != null) {
      timefilter.setTime({
        from: new Date(start).toISOString(),
        to: new Date(end).toISOString(),
      });
    }

    const onQuerySubmit = useCallback(
      (payload: { dateRange: TimeRange; query?: Query }) => {
        const isQuickSelection =
          payload.dateRange.from.includes('now') || payload.dateRange.to.includes('now');
        let updateSearchBar: UpdateReduxSearchBar = {
          id,
          end: toStr != null ? toStr : new Date(end).toISOString(),
          start: fromStr != null ? fromStr : new Date(start).toISOString(),
          isInvalid: false,
          isQuickSelection,
          updateTime: false,
        };
        let isStateUpdated = false;

        if (
          (isQuickSelection &&
            (fromStr !== payload.dateRange.from || toStr !== payload.dateRange.to)) ||
          (!isQuickSelection &&
            (start !== formatDate(payload.dateRange.from) ||
              end !== formatDate(payload.dateRange.to)))
        ) {
          isStateUpdated = true;
          updateSearchBar.updateTime = true;
          updateSearchBar.end = payload.dateRange.to;
          updateSearchBar.start = payload.dateRange.from;
        }

        if (payload.query != null && !isEqual(payload.query, filterQuery)) {
          isStateUpdated = true;
          updateSearchBar = set('query', payload.query, updateSearchBar);
        }

        if (!isStateUpdated) {
          // That mean we are doing a refresh!
          if (isQuickSelection) {
            updateSearchBar.updateTime = true;
            updateSearchBar.end = payload.dateRange.to;
            updateSearchBar.start = payload.dateRange.from;
          } else {
            queries.forEach(q => q.refetch && (q.refetch as inputsModel.Refetch)());
          }
        }

        window.setTimeout(() => updateSearch(updateSearchBar), 0);
      },
      [id, end, filterQuery, fromStr, queries, start, toStr]
    );

    const onRefresh = useCallback(
      (payload: { dateRange: TimeRange }) => {
        if (payload.dateRange.from.includes('now') || payload.dateRange.to.includes('now')) {
          updateSearch({
            id,
            end: payload.dateRange.to,
            start: payload.dateRange.from,
            isInvalid: false,
            isQuickSelection: true,
            updateTime: true,
          });
        } else {
          queries.forEach(q => q.refetch && (q.refetch as inputsModel.Refetch)());
        }
      },
      [id, queries]
    );

    const onSaved = useCallback(
      (newSavedQuery: SavedQuery) => {
        setSavedQuery({ id, savedQuery: newSavedQuery });
      },
      [id]
    );

    const onSavedQueryUpdated = useCallback(
      (savedQueryUpdated: SavedQuery) => {
        const isQuickSelection = savedQueryUpdated.attributes.timefilter
          ? savedQueryUpdated.attributes.timefilter.from.includes('now') ||
            savedQueryUpdated.attributes.timefilter.to.includes('now')
          : false;

        let updateSearchBar: UpdateReduxSearchBar = {
          id,
          filters: savedQueryUpdated.attributes.filters || [],
          end: toStr != null ? toStr : new Date(end).toISOString(),
          start: fromStr != null ? fromStr : new Date(start).toISOString(),
          isInvalid: false,
          isQuickSelection,
          updateTime: false,
        };

        if (savedQueryUpdated.attributes.timefilter) {
          updateSearchBar.end = savedQueryUpdated.attributes.timefilter
            ? savedQueryUpdated.attributes.timefilter.to
            : updateSearchBar.end;
          updateSearchBar.start = savedQueryUpdated.attributes.timefilter
            ? savedQueryUpdated.attributes.timefilter.from
            : updateSearchBar.start;
          updateSearchBar.updateTime = true;
        }

        updateSearchBar = set('query', savedQueryUpdated.attributes.query, updateSearchBar);
        updateSearchBar = set('savedQuery', savedQueryUpdated, updateSearchBar);

        updateSearch(updateSearchBar);
      },
      [id, end, fromStr, start, toStr]
    );

    const onClearSavedQuery = useCallback(() => {
      if (savedQuery != null) {
        updateSearch({
          id,
          filters: [],
          end: toStr != null ? toStr : new Date(end).toISOString(),
          start: fromStr != null ? fromStr : new Date(start).toISOString(),
          isInvalid: false,
          isQuickSelection: false,
          updateTime: false,
          query: {
            query: '',
            language: savedQuery.attributes.query.language,
          },
          resetSavedQuery: true,
          savedQuery: undefined,
        });
      }
    }, [id, end, fromStr, start, toStr, savedQuery]);

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
    const indexPatterns = useMemo(() => [indexPattern as IndexPattern], [indexPattern]);
    return (
      <SearchBarContainer data-test-subj={`${id}DatePicker`}>
        <SearchBar
          appName="siem"
          isLoading={isLoading}
          indexPatterns={indexPatterns}
          query={filterQuery}
          onClearSavedQuery={onClearSavedQuery}
          onQuerySubmit={onQuerySubmit}
          onRefresh={onRefresh}
          onSaved={onSaved}
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

SearchBarComponent.displayName = 'SiemSearchBar';

interface UpdateReduxSearchBar extends OnTimeChangeProps {
  id: InputsModelId;
  filters?: esFilters.Filter[];
  query?: Query;
  savedQuery?: SavedQuery;
  resetSavedQuery?: boolean;
  timelineId?: string;
  updateTime: boolean;
}

type DispatchUpdateSearch = ({
  end,
  id,
  isQuickSelection,
  start,
  timelineId,
}: UpdateReduxSearchBar) => void;

export const dispatchUpdateSearch = (dispatch: Dispatch) => ({
  end,
  filters,
  id,
  isQuickSelection,
  query,
  resetSavedQuery,
  savedQuery,
  start,
  timelineId,
  updateTime = false,
}: UpdateReduxSearchBar): void => {
  if (updateTime) {
    const fromDate = formatDate(start);
    let toDate = formatDate(end, { roundUp: true });
    if (isQuickSelection) {
      dispatch(
        inputsActions.setRelativeRangeDatePicker({
          id,
          fromStr: start,
          toStr: end,
          from: fromDate,
          to: toDate,
        })
      );
    } else {
      toDate = formatDate(end);
      dispatch(
        inputsActions.setAbsoluteRangeDatePicker({
          id,
          from: formatDate(start),
          to: formatDate(end),
        })
      );
    }
    if (timelineId != null) {
      dispatch(
        timelineActions.updateRange({
          id: timelineId,
          start: fromDate,
          end: toDate,
        })
      );
    }
  }
  if (query != null) {
    dispatch(
      inputsActions.setFilterQuery({
        id,
        ...query,
      })
    );
  }
  if (filters != null) {
    siemFilterManager.setFilters(filters);
  }
  if (savedQuery != null || resetSavedQuery) {
    dispatch(inputsActions.setSavedQuery({ id, savedQuery }));
  }

  dispatch(hostsActions.setHostTablesActivePageToZero());
  dispatch(networkActions.setNetworkTablesActivePageToZero());
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  updateSearch: dispatchUpdateSearch(dispatch),
  setSavedQuery: ({ id, savedQuery }: { id: InputsModelId; savedQuery: SavedQuery | undefined }) =>
    dispatch(inputsActions.setSavedQuery({ id, savedQuery })),
  setSearchBarFilter: ({ id, filters }: { id: InputsModelId; filters: esFilters.Filter[] }) =>
    dispatch(inputsActions.setSearchBarFilter({ id, filters })),
});

export const SiemSearchBar = connect(makeMapStateToProps, mapDispatchToProps)(SearchBarComponent);
