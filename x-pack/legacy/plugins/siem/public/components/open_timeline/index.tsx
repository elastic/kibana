/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import ApolloClient from 'apollo-client';
import { getOr, assign } from 'lodash/fp';
import * as React from 'react';
import { connect } from 'react-redux';

import {
  defaultHeaders,
  defaultColumnHeaderType,
} from '../../components/timeline/body/column_headers/default_headers';
import { deleteTimelineMutation } from '../../containers/timeline/delete/persist.gql_query';
import { AllTimelinesVariables } from '../../containers/timeline/all';

import { allTimelinesQuery } from '../../containers/timeline/all/index.gql_query';
import { oneTimelineQuery } from '../../containers/timeline/one/index.gql_query';
import {
  DeleteTimelineMutation,
  GetOneTimeline,
  TimelineResult,
  SortFieldTimeline,
} from '../../graphql/types';
import { Note } from '../../lib/note';
import { State, timelineSelectors } from '../../store';
import { addNotes as dispatchAddNotes } from '../../store/app/actions';
import { setTimelineRangeDatePicker as dispatchSetTimelineRangeDatePicker } from '../../store/inputs/actions';
import {
  applyKqlFilterQuery as dispatchApplyKqlFilterQuery,
  addTimeline as dispatchAddTimeline,
  createTimeline as dispatchCreateNewTimeline,
  setKqlFilterQueryDraft as dispatchSetKqlFilterQueryDraft,
  updateIsLoading as dispatchUpdateIsLoading,
} from '../../store/timeline/actions';
import { TimelineModel } from '../../store/timeline/model';
import { OpenTimeline } from './open_timeline';
import { OPEN_TIMELINE_CLASS_NAME } from './helpers';
import { OpenTimelineModal } from './open_timeline_modal/open_timeline_modal';
import {
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
import { AllTimelinesQuery } from '../../containers/timeline/all';
import { Direction } from '../../graphql/types';
import { DEFAULT_DATE_COLUMN_MIN_WIDTH, DEFAULT_COLUMN_MIN_WIDTH } from '../timeline/body/helpers';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import { DEFAULT_SORT_FIELD, DEFAULT_SORT_DIRECTION } from './constants';

export interface OpenTimelineState {
  /** Required by EuiTable for expandable rows: a map of `TimelineResult.savedObjectId` to rendered notes */
  itemIdToExpandedNotesRowMap: Record<string, JSX.Element>;
  /** Only query for favorite timelines when true */
  onlyFavorites: boolean;
  /** The requested page of results */
  pageIndex: number;
  /** The requested size of each page of search results */
  pageSize: number;
  /** The current search criteria */
  search: string;
  /** The currently-selected timelines in the table */
  selectedItems: OpenTimelineResult[];
  /** The requested sort direction of the query results */
  sortDirection: 'asc' | 'desc';
  /** The requested field to sort on */
  sortField: string;
}

interface OwnProps<TCache = object> {
  apolloClient: ApolloClient<TCache>;
  /** Displays open timeline in modal */
  isModal: boolean;
  closeModalTimeline?: () => void;
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
export class StatefulOpenTimelineComponent extends React.PureComponent<
  OpenTimelineOwnProps,
  OpenTimelineState
> {
  constructor(props: OpenTimelineOwnProps) {
    super(props);

    this.state = {
      itemIdToExpandedNotesRowMap: {},
      onlyFavorites: false,
      search: '',
      pageIndex: 0,
      pageSize: props.defaultPageSize,
      sortField: DEFAULT_SORT_FIELD,
      sortDirection: DEFAULT_SORT_DIRECTION,
      selectedItems: [],
    };
  }

  public componentDidMount() {
    this.focusInput();
  }

  public render() {
    const { defaultPageSize, isModal = false, title } = this.props;
    const {
      itemIdToExpandedNotesRowMap,
      onlyFavorites,
      pageIndex,
      pageSize,
      search: query,
      selectedItems,
      sortDirection,
      sortField,
    } = this.state;
    return (
      <AllTimelinesQuery
        pageInfo={{
          pageIndex: pageIndex + 1,
          pageSize,
        }}
        search={query}
        sort={{ sortField: sortField as SortFieldTimeline, sortOrder: sortDirection as Direction }}
        onlyUserFavorite={onlyFavorites}
      >
        {({ timelines, loading, totalCount }) => {
          return !isModal ? (
            <OpenTimeline
              deleteTimelines={this.onDeleteOneTimeline}
              defaultPageSize={defaultPageSize}
              isLoading={loading}
              itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
              onAddTimelinesToFavorites={undefined}
              onDeleteSelected={this.onDeleteSelected}
              onlyFavorites={onlyFavorites}
              onOpenTimeline={this.openTimeline}
              onQueryChange={this.onQueryChange}
              onSelectionChange={this.onSelectionChange}
              onTableChange={this.onTableChange}
              onToggleOnlyFavorites={this.onToggleOnlyFavorites}
              onToggleShowNotes={this.onToggleShowNotes}
              pageIndex={pageIndex}
              pageSize={pageSize}
              query={query}
              searchResults={timelines}
              selectedItems={selectedItems}
              sortDirection={sortDirection}
              sortField={sortField}
              title={title}
              totalSearchResultsCount={totalCount}
            />
          ) : (
            <OpenTimelineModal
              deleteTimelines={this.onDeleteOneTimeline}
              defaultPageSize={defaultPageSize}
              isLoading={loading}
              itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
              onAddTimelinesToFavorites={undefined}
              onlyFavorites={onlyFavorites}
              onOpenTimeline={this.openTimeline}
              onQueryChange={this.onQueryChange}
              onSelectionChange={this.onSelectionChange}
              onTableChange={this.onTableChange}
              onToggleOnlyFavorites={this.onToggleOnlyFavorites}
              onToggleShowNotes={this.onToggleShowNotes}
              pageIndex={pageIndex}
              pageSize={pageSize}
              query={query}
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

  /** Invoked when the user presses enters to submit the text in the search input */
  private onQueryChange: OnQueryChange = (query: EuiSearchBarQuery) => {
    this.setState({
      search: query.queryText.trim(),
    });
  };

  /** Focuses the input that filters the field browser */
  private focusInput = () => {
    const elements = document.querySelector<HTMLElement>(`.${OPEN_TIMELINE_CLASS_NAME} input`);

    if (elements != null) {
      elements.focus();
    }
  };

  /* This feature will be implemented in the near future, so we are keeping it to know what to do */

  /** Invoked when the user clicks the action to add the selected timelines to favorites */
  // private onAddTimelinesToFavorites: OnAddTimelinesToFavorites = () => {
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

  private onDeleteOneTimeline: OnDeleteOneTimeline = (timelineIds: string[]) => {
    const { onlyFavorites, pageIndex, pageSize, search, sortDirection, sortField } = this.state;

    this.deleteTimelines(timelineIds, {
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
  };

  /** Invoked when the user clicks the action to delete the selected timelines */
  private onDeleteSelected: OnDeleteSelected = () => {
    const { selectedItems, onlyFavorites } = this.state;

    this.deleteTimelines(getSelectedTimelineIds(selectedItems), {
      search: this.state.search,
      pageInfo: {
        pageIndex: this.state.pageIndex + 1,
        pageSize: this.state.pageSize,
      },
      sort: {
        sortField: this.state.sortField as SortFieldTimeline,
        sortOrder: this.state.sortDirection as Direction,
      },
      onlyUserFavorite: onlyFavorites,
    });

    // NOTE: we clear the selection state below, but if the server fails to
    // delete a timeline, it will remain selected in the table:
    this.resetSelectionState();

    // TODO: the query must re-execute to show the results of the deletion
  };

  /** Invoked when the user selects (or de-selects) timelines */
  private onSelectionChange: OnSelectionChange = (selectedItems: OpenTimelineResult[]) => {
    this.setState({ selectedItems }); // <-- this is NOT passed down as props to the table: https://github.com/elastic/eui/issues/1077
  };

  /** Invoked by the EUI table implementation when the user interacts with the table (i.e. to update sorting) */
  private onTableChange: OnTableChange = ({ page, sort }: OnTableChangeParams) => {
    const { index: pageIndex, size: pageSize } = page;
    const { field: sortField, direction: sortDirection } = sort;

    this.setState({
      pageIndex,
      pageSize,
      sortDirection,
      sortField,
    });
  };

  /** Invoked when the user toggles the option to only view favorite timelines */
  private onToggleOnlyFavorites: OnToggleOnlyFavorites = () => {
    this.setState(state => ({
      onlyFavorites: !state.onlyFavorites,
    }));
  };

  /** Invoked when the user toggles the expansion or collapse of inline notes in a table row */
  private onToggleShowNotes: OnToggleShowNotes = (
    itemIdToExpandedNotesRowMap: Record<string, JSX.Element>
  ) => {
    this.setState(() => ({
      itemIdToExpandedNotesRowMap,
    }));
  };

  /** Resets the selection state such that all timelines are unselected */
  private resetSelectionState = () => {
    this.setState({
      selectedItems: [],
    });
  };

  private openTimeline: OnOpenTimeline = ({
    duplicate,
    timelineId,
  }: {
    duplicate: boolean;
    timelineId: string;
  }) => {
    const {
      applyKqlFilterQuery,
      addNotes,
      addTimeline,
      closeModalTimeline,
      isModal,
      setTimelineRangeDatePicker,
      setKqlFilterQueryDraft,
      updateIsLoading,
    } = this.props;

    if (isModal && closeModalTimeline != null) {
      closeModalTimeline();
    }

    updateIsLoading({ id: 'timeline-1', isLoading: true });
    this.props.apolloClient
      .query<GetOneTimeline.Query, GetOneTimeline.Variables>({
        query: oneTimelineQuery,
        fetchPolicy: 'no-cache',
        variables: { id: timelineId },
      })
      // eslint-disable-next-line
      .then(result => {
        const timelineToOpen: TimelineResult = omitTypenameInTimeline(
          getOr({}, 'data.getOneTimeline', result)
        );

        const { notes, ...timelineModel } = timelineToOpen;
        const momentDate = dateMath.parse('now-24h');
        setTimelineRangeDatePicker({
          from: getOr(momentDate ? momentDate.valueOf() : 0, 'dateRange.start', timelineModel),
          to: getOr(Date.now(), 'dateRange.end', timelineModel),
        });

        addTimeline({
          id: 'timeline-1',
          timeline: {
            ...assign(this.props.timeline, timelineModel),
            columns:
              timelineModel.columns != null
                ? timelineModel.columns.map(col => {
                    const timelineCols: ColumnHeader = {
                      ...col,
                      columnHeaderType: defaultColumnHeaderType,
                      id: col.id != null ? col.id : 'unknown',
                      placeholder: col.placeholder != null ? col.placeholder : undefined,
                      category: col.category != null ? col.category : undefined,
                      description: col.description != null ? col.description : undefined,
                      example: col.example != null ? col.example : undefined,
                      type: col.type != null ? col.type : undefined,
                      aggregatable: col.aggregatable != null ? col.aggregatable : undefined,
                      width:
                        col.id === '@timestamp'
                          ? DEFAULT_DATE_COLUMN_MIN_WIDTH
                          : DEFAULT_COLUMN_MIN_WIDTH,
                    };
                    return timelineCols;
                  })
                : defaultHeaders,
            eventIdToNoteIds: duplicate
              ? {}
              : timelineModel.eventIdToNoteIds != null
              ? timelineModel.eventIdToNoteIds.reduce((acc, note) => {
                  if (note.eventId != null) {
                    const eventNotes = getOr([], note.eventId, acc);
                    return { ...acc, [note.eventId]: [...eventNotes, note.noteId] };
                  }
                  return acc;
                }, {})
              : {},
            isFavorite: duplicate
              ? false
              : timelineModel.favorite != null
              ? timelineModel.favorite.length > 0
              : false,
            isLive: false,
            isSaving: false,
            itemsPerPage: 25,
            noteIds: duplicate ? [] : timelineModel.noteIds != null ? timelineModel.noteIds : [],
            pinnedEventIds: duplicate
              ? {}
              : timelineModel.pinnedEventIds != null
              ? timelineModel.pinnedEventIds.reduce(
                  (acc, pinnedEventId) => ({ ...acc, [pinnedEventId]: true }),
                  {}
                )
              : {},
            pinnedEventsSaveObject: duplicate
              ? {}
              : timelineModel.pinnedEventsSaveObject != null
              ? timelineModel.pinnedEventsSaveObject.reduce(
                  (acc, pinnedEvent) => ({ ...acc, [pinnedEvent.pinnedEventId]: pinnedEvent }),
                  {}
                )
              : {},
            savedObjectId: duplicate ? null : timelineModel.savedObjectId,
            version: duplicate ? null : timelineModel.version,
            title: duplicate ? '' : timelineModel.title || '',
          },
        });

        if (
          timelineModel.kqlQuery != null &&
          timelineModel.kqlQuery.filterQuery != null &&
          timelineModel.kqlQuery.filterQuery.kuery != null &&
          timelineModel.kqlQuery.filterQuery.kuery.expression !== ''
        ) {
          setKqlFilterQueryDraft({
            id: 'timeline-1',
            filterQueryDraft: {
              kind: 'kuery',
              expression: timelineModel.kqlQuery.filterQuery.kuery.expression || '',
            },
          });
          applyKqlFilterQuery({
            id: 'timeline-1',
            filterQuery: {
              kuery: {
                kind: 'kuery',
                expression: timelineModel.kqlQuery.filterQuery.kuery.expression || '',
              },
              serializedQuery: timelineModel.kqlQuery.filterQuery.serializedQuery || '',
            },
          });
        }

        if (!duplicate) {
          addNotes({
            notes:
              notes != null
                ? notes.map<Note>(note => ({
                    created: note.created != null ? new Date(note.created) : new Date(),
                    id: note.noteId,
                    lastEdit: note.updated != null ? new Date(note.updated) : new Date(),
                    note: note.note || '',
                    user: note.updatedBy || 'unknown',
                    saveObjectId: note.noteId,
                    version: note.version,
                  }))
                : [],
          });
        }
      })
      .finally(() => {
        updateIsLoading({ id: 'timeline-1', isLoading: false });
      });
  };

  private deleteTimelines: DeleteTimelines = (
    timelineIds: string[],
    variables?: AllTimelinesVariables
  ) => {
    if (timelineIds.includes(this.props.timeline.savedObjectId || '')) {
      this.props.createNewTimeline({ id: 'timeline-1', columns: defaultHeaders, show: false });
    }
    this.props.apolloClient.mutate<
      DeleteTimelineMutation.Mutation,
      DeleteTimelineMutation.Variables
    >({
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
  };
}

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State) => {
    const timeline = getTimeline(state, 'timeline-1');

    return {
      timeline,
    };
  };
  return mapStateToProps;
};

export const StatefulOpenTimeline = connect(
  makeMapStateToProps,
  {
    applyKqlFilterQuery: dispatchApplyKqlFilterQuery,
    addTimeline: dispatchAddTimeline,
    addNotes: dispatchAddNotes,
    createNewTimeline: dispatchCreateNewTimeline,
    setKqlFilterQueryDraft: dispatchSetKqlFilterQueryDraft,
    setTimelineRangeDatePicker: dispatchSetTimelineRangeDatePicker,
    updateIsLoading: dispatchUpdateIsLoading,
  }
)(StatefulOpenTimelineComponent);

const omitTypename = (key: string, value: keyof TimelineModel) =>
  key === '__typename' ? undefined : value;

const omitTypenameInTimeline = (timeline: TimelineResult): TimelineResult =>
  JSON.parse(JSON.stringify(timeline), omitTypename);
