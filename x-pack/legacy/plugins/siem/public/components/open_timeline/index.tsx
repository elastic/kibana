/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-client';
import React, { useEffect, useState, useCallback } from 'react';
import { connect } from 'react-redux';

import { Dispatch } from 'redux';
import { defaultHeaders } from '../../components/timeline/body/column_headers/default_headers';
import { deleteTimelineMutation } from '../../containers/timeline/delete/persist.gql_query';
import { AllTimelinesVariables, AllTimelinesQuery } from '../../containers/timeline/all';
import { allTimelinesQuery } from '../../containers/timeline/all/index.gql_query';
import { DeleteTimelineMutation, SortFieldTimeline, Direction } from '../../graphql/types';
import { State, timelineSelectors } from '../../store';
import { timelineDefaults, TimelineModel } from '../../store/timeline/model';
import {
  createTimeline as dispatchCreateNewTimeline,
  updateIsLoading as dispatchUpdateIsLoading,
} from '../../store/timeline/actions';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import { OpenTimeline } from './open_timeline';
import { OPEN_TIMELINE_CLASS_NAME, queryTimelineById, dispatchUpdateTimeline } from './helpers';
import { OpenTimelineModalBody } from './open_timeline_modal/open_timeline_modal_body';
import {
  ActionTimelineToShow,
  DeleteTimelines,
  EuiSearchBarQuery,
  OnDeleteSelected,
  OnOpenTimeline,
  OnQueryChange,
  OnSelectionChange,
  OnTableChange,
  OnTableChangeParams,
  OpenTimelineProps,
  OnToggleOnlyFavorites,
  OpenTimelineResult,
  OnToggleShowNotes,
  OnDeleteOneTimeline,
  OpenTimelineDispatchProps,
  OpenTimelineReduxProps,
} from './types';
import { DEFAULT_SORT_FIELD, DEFAULT_SORT_DIRECTION } from './constants';

interface OwnProps<TCache = object> {
  apolloClient: ApolloClient<TCache>;
  /** Displays open timeline in modal */
  isModal: boolean;
  closeModalTimeline?: () => void;
  hideActions?: ActionTimelineToShow[];
  onOpenTimeline?: (timeline: TimelineModel) => void;
}

export type OpenTimelineOwnProps = OwnProps &
  Pick<OpenTimelineProps, 'defaultPageSize' | 'title'> &
  OpenTimelineDispatchProps &
  OpenTimelineReduxProps;

/** Returns a collection of selected timeline ids */
export const getSelectedTimelineIds = (selectedItems: OpenTimelineResult[]): string[] =>
  selectedItems.reduce<string[]>(
    (validSelections, timelineResult) =>
      timelineResult.savedObjectId != null
        ? [...validSelections, timelineResult.savedObjectId]
        : validSelections,
    []
  );

/** Manages the state (e.g table selection) of the (pure) `OpenTimeline` component */
export const StatefulOpenTimelineComponent = React.memo<OpenTimelineOwnProps>(
  ({
    apolloClient,
    closeModalTimeline,
    createNewTimeline,
    defaultPageSize,
    hideActions = [],
    isModal = false,
    onOpenTimeline,
    timeline,
    title,
    updateTimeline,
    updateIsLoading,
  }) => {
    /** Required by EuiTable for expandable rows: a map of `TimelineResult.savedObjectId` to rendered notes */
    const [itemIdToExpandedNotesRowMap, setItemIdToExpandedNotesRowMap] = useState<
      Record<string, JSX.Element>
    >({});
    /** Only query for favorite timelines when true */
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    /** The requested page of results */
    const [pageIndex, setPageIndex] = useState(0);
    /** The requested size of each page of search results */
    const [pageSize, setPageSize] = useState(defaultPageSize);
    /** The current search criteria */
    const [search, setSearch] = useState('');
    /** The currently-selected timelines in the table */
    const [selectedItems, setSelectedItems] = useState<OpenTimelineResult[]>([]);
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

    /* This feature will be implemented in the near future, so we are keeping it to know what to do */

    /** Invoked when the user clicks the action to add the selected timelines to favorites */
    // const onAddTimelinesToFavorites: OnAddTimelinesToFavorites = () => {
    // const { addTimelinesToFavorites } = this.props;
    // const { selectedItems } = this.state;
    // if (addTimelinesToFavorites != null) {
    //   addTimelinesToFavorites(getSelectedTimelineIds(selectedItems));
    // TODO: it's not possible to clear the selection state of the newly-favorited
    // items, because we can't pass the selection state as props to the table.
    // See: https://github.com/elastic/eui/issues/1077
    // TODO: the query must re-execute to show the results of the mutation
    // }
    // };

    const onDeleteOneTimeline: OnDeleteOneTimeline = useCallback(
      (timelineIds: string[]) => {
        deleteTimelines(timelineIds, {
          search,
          pageInfo: {
            pageIndex: pageIndex + 1,
            pageSize,
          },
          sort: {
            sortField: sortField as SortFieldTimeline,
            sortOrder: sortDirection as Direction,
          },
          onlyUserFavorite: onlyFavorites,
        });
      },
      [search, pageIndex, pageSize, sortField, sortDirection, onlyFavorites]
    );

    /** Invoked when the user clicks the action to delete the selected timelines */
    const onDeleteSelected: OnDeleteSelected = useCallback(() => {
      deleteTimelines(getSelectedTimelineIds(selectedItems), {
        search,
        pageInfo: {
          pageIndex: pageIndex + 1,
          pageSize,
        },
        sort: {
          sortField: sortField as SortFieldTimeline,
          sortOrder: sortDirection as Direction,
        },
        onlyUserFavorite: onlyFavorites,
      });

      // NOTE: we clear the selection state below, but if the server fails to
      // delete a timeline, it will remain selected in the table:
      resetSelectionState();

      // TODO: the query must re-execute to show the results of the deletion
    }, [selectedItems, search, pageIndex, pageSize, sortField, sortDirection, onlyFavorites]);

    /** Invoked when the user selects (or de-selects) timelines */
    const onSelectionChange: OnSelectionChange = useCallback(
      (newSelectedItems: OpenTimelineResult[]) => {
        setSelectedItems(newSelectedItems); // <-- this is NOT passed down as props to the table: https://github.com/elastic/eui/issues/1077
      },
      []
    );

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

    /** Invoked when the user toggles the expansion or collapse of inline notes in a table row */
    const onToggleShowNotes: OnToggleShowNotes = useCallback(
      (newItemIdToExpandedNotesRowMap: Record<string, JSX.Element>) => {
        setItemIdToExpandedNotesRowMap(newItemIdToExpandedNotesRowMap);
      },
      []
    );

    /** Resets the selection state such that all timelines are unselected */
    const resetSelectionState = useCallback(() => {
      setSelectedItems([]);
    }, []);

    const openTimeline: OnOpenTimeline = useCallback(
      ({ duplicate, timelineId }: { duplicate: boolean; timelineId: string }) => {
        if (isModal && closeModalTimeline != null) {
          closeModalTimeline();
        }

        queryTimelineById({
          apolloClient,
          duplicate,
          onOpenTimeline,
          timelineId,
          updateIsLoading,
          updateTimeline,
        });
      },
      [apolloClient, updateIsLoading, updateTimeline]
    );

    const deleteTimelines: DeleteTimelines = useCallback(
      (timelineIds: string[], variables?: AllTimelinesVariables) => {
        if (timelineIds.includes(timeline.savedObjectId || '')) {
          createNewTimeline({ id: 'timeline-1', columns: defaultHeaders, show: false });
        }
        apolloClient.mutate<DeleteTimelineMutation.Mutation, DeleteTimelineMutation.Variables>({
          mutation: deleteTimelineMutation,
          fetchPolicy: 'no-cache',
          variables: { id: timelineIds },
          refetchQueries: [
            {
              query: allTimelinesQuery,
              variables,
            },
          ],
        });
      },
      [apolloClient, createNewTimeline, timeline]
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
        {({ timelines, loading, totalCount }) => {
          return !isModal ? (
            <OpenTimeline
              data-test-subj={'open-timeline'}
              deleteTimelines={onDeleteOneTimeline}
              defaultPageSize={defaultPageSize}
              isLoading={loading}
              itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
              onAddTimelinesToFavorites={undefined}
              onDeleteSelected={onDeleteSelected}
              onlyFavorites={onlyFavorites}
              onOpenTimeline={openTimeline}
              onQueryChange={onQueryChange}
              onSelectionChange={onSelectionChange}
              onTableChange={onTableChange}
              onToggleOnlyFavorites={onToggleOnlyFavorites}
              onToggleShowNotes={onToggleShowNotes}
              pageIndex={pageIndex}
              pageSize={pageSize}
              query={search}
              searchResults={timelines}
              selectedItems={selectedItems}
              sortDirection={sortDirection}
              sortField={sortField}
              title={title}
              totalSearchResultsCount={totalCount}
            />
          ) : (
            <OpenTimelineModalBody
              data-test-subj={'open-timeline-modal'}
              deleteTimelines={onDeleteOneTimeline}
              defaultPageSize={defaultPageSize}
              hideActions={hideActions}
              isLoading={loading}
              itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
              onAddTimelinesToFavorites={undefined}
              onlyFavorites={onlyFavorites}
              onOpenTimeline={openTimeline}
              onQueryChange={onQueryChange}
              onSelectionChange={onSelectionChange}
              onTableChange={onTableChange}
              onToggleOnlyFavorites={onToggleOnlyFavorites}
              onToggleShowNotes={onToggleShowNotes}
              pageIndex={pageIndex}
              pageSize={pageSize}
              query={search}
              searchResults={timelines}
              selectedItems={selectedItems}
              sortDirection={sortDirection}
              sortField={sortField}
              title={title}
              totalSearchResultsCount={totalCount}
            />
          );
        }}
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
    columns: ColumnHeader[];
    show?: boolean;
  }) => dispatch(dispatchCreateNewTimeline({ id, columns, show })),
  updateIsLoading: ({ id, isLoading }: { id: string; isLoading: boolean }) =>
    dispatch(dispatchUpdateIsLoading({ id, isLoading })),
  updateTimeline: dispatchUpdateTimeline(dispatch),
});

export const StatefulOpenTimeline = connect(
  makeMapStateToProps,
  mapDispatchToProps
)(StatefulOpenTimelineComponent);
