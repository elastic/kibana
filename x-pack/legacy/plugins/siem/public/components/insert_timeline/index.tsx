/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-client';
import React, { useEffect, useState, useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { Dispatch } from 'redux';
import { AllTimelinesQuery } from '../../containers/timeline/all';
import { SortFieldTimeline, Direction } from '../../graphql/types';
import { State, timelineSelectors } from '../../store';
import { ColumnHeaderOptions, TimelineModel } from '../../store/timeline/model';
import { timelineDefaults } from '../../store/timeline/defaults';
import {
  createTimeline as dispatchCreateNewTimeline,
  updateIsLoading as dispatchUpdateIsLoading,
} from '../../store/timeline/actions';
import { OPEN_TIMELINE_CLASS_NAME, queryTimelineById, dispatchUpdateTimeline } from './helpers';
import { InsertTimelinePopoverBody } from './insert_timeline_popover/insert_timeline_popover_body';
import {
  ActionTimelineToShow,
  EuiSearchBarQuery,
  OnInsertTimeline,
  OnQueryChange,
  OnTableChange,
  OnTableChangeParams,
  InsertTimelineProps,
  OnToggleOnlyFavorites,
} from './types';
import { DEFAULT_SORT_FIELD, DEFAULT_SORT_DIRECTION } from './constants';

interface OwnProps<TCache = object> {
  apolloClient: ApolloClient<TCache>;
  hideActions?: ActionTimelineToShow[];
  onInsertTimeline?: (timeline: TimelineModel) => void;
}

export type InsertTimelineOwnProps = OwnProps &
  Pick<InsertTimelineProps, 'defaultPageSize' | 'title'> &
  PropsFromRedux;

/** Manages the state (e.g table selection) of the (pure) `InsertTimeline` component */
export const StatefulInsertTimelineComponent = React.memo<InsertTimelineOwnProps>(
  ({
    apolloClient,
    createNewTimeline,
    defaultPageSize,
    hideActions = [],
    onInsertTimeline,
    timeline,
    title,
    updateTimeline,
    updateIsLoading,
  }) => {
    /** Required by EuiTable for expandable rows: a map of `TimelineResult.savedObjectId` to rendered notes */
    /** Only query for favorite timelines when true */
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    /** The requested page of results */
    const [pageIndex, setPageIndex] = useState(0);
    /** The requested size of each page of search results */
    const [pageSize, setPageSize] = useState(defaultPageSize);
    /** The current search criteria */
    const [search, setSearch] = useState('');
    /** The requested sort direction of the query results */
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIRECTION);
    /** The requested field to sort on */
    const [sortField, setSortField] = useState(DEFAULT_SORT_FIELD);

    /** Invoked when the user presses enters to submit the text in the search input */
    const onQueryChange: OnQueryChange = useCallback((query: EuiSearchBarQuery) => {
      setSearch(query.queryText.trim());
    }, []);

    /** Focuses the input that filters the field browser */
    const focusInput = () => {
      const elements = document.querySelector<HTMLElement>(`.${OPEN_TIMELINE_CLASS_NAME} input`);

      if (elements != null) {
        elements.focus();
      }
    };

    /** Invoked by the EUI table implementation when the user interacts with the table (i.e. to update sorting) */
    const onTableChange: OnTableChange = useCallback(({ page, sort }: OnTableChangeParams) => {
      const { index, size } = page;
      const { field, direction } = sort;
      setPageIndex(index);
      setPageSize(size);
      setSortDirection(direction);
      setSortField(field);
    }, []);

    /** Invoked when the user toggles the option to only view favorite timelines */
    const onToggleOnlyFavorites: OnToggleOnlyFavorites = useCallback(() => {
      setOnlyFavorites(!onlyFavorites);
    }, [onlyFavorites]);

    const openTimeline: OnInsertTimeline = useCallback(
      ({ duplicate, timelineId }: { duplicate: boolean; timelineId: string }) => {
        queryTimelineById({
          apolloClient,
          duplicate,
          onInsertTimeline,
          timelineId,
          updateIsLoading,
          updateTimeline,
        });
      },
      [apolloClient, updateIsLoading, updateTimeline]
    );

    useEffect(() => {
      focusInput();
    }, []);

    return (
      <AllTimelinesQuery
        pageInfo={{
          pageIndex: pageIndex + 1,
          pageSize,
        }}
        search={search}
        sort={{ sortField: sortField as SortFieldTimeline, sortOrder: sortDirection as Direction }}
        onlyUserFavorite={onlyFavorites}
      >
        {({ timelines, loading, totalCount }) => (
          <InsertTimelinePopoverBody
            data-test-subj={'insert-timeline-modal'}
            defaultPageSize={defaultPageSize}
            hideActions={hideActions}
            isLoading={loading}
            onlyFavorites={onlyFavorites}
            onInsertTimeline={openTimeline}
            onQueryChange={onQueryChange}
            onTableChange={onTableChange}
            onToggleOnlyFavorites={onToggleOnlyFavorites}
            pageIndex={pageIndex}
            pageSize={pageSize}
            query={search}
            searchResults={timelines}
            sortDirection={sortDirection}
            sortField={sortField}
            title={title}
            totalSearchResultsCount={totalCount}
          />
        )}
      </AllTimelinesQuery>
    );
  }
);

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State) => {
    const timeline = getTimeline(state, 'timeline-1') ?? timelineDefaults;

    return {
      timeline,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  createNewTimeline: ({
    id,
    columns,
    show,
  }: {
    id: string;
    columns: ColumnHeaderOptions[];
    show?: boolean;
  }) => dispatch(dispatchCreateNewTimeline({ id, columns, show })),
  updateIsLoading: ({ id, isLoading }: { id: string; isLoading: boolean }) =>
    dispatch(dispatchUpdateIsLoading({ id, isLoading })),
  updateTimeline: dispatchUpdateTimeline(dispatch),
});

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulInsertTimeline = connector(StatefulInsertTimelineComponent);
