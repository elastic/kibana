/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiLoadingContent } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { ActionCreator } from 'typescript-fsa';

import { esFilters, esQuery } from '../../../../../../../../../src/plugins/data/common/es_query';
import { Query } from '../../../../../../../../../src/plugins/data/common/query';
import { useFetchIndexPatterns } from '../../../../containers/detection_engine/rules/fetch_index_patterns';
import { StatefulEventsViewer } from '../../../../components/events_viewer';
import { HeaderSection } from '../../../../components/header_section';
import { DispatchUpdateTimeline } from '../../../../components/open_timeline/types';
import { combineQueries } from '../../../../components/timeline/helpers';
import { TimelineNonEcsData } from '../../../../graphql/types';
import { useKibana } from '../../../../lib/kibana';
import { inputsSelectors, State, inputsModel } from '../../../../store';
import { timelineActions, timelineSelectors } from '../../../../store/timeline';
import { TimelineModel } from '../../../../store/timeline/model';
import { timelineDefaults } from '../../../../store/timeline/defaults';
import { useApolloClient } from '../../../../utils/apollo_context';

import { updateSignalStatusAction } from './actions';
import {
  getSignalsActions,
  requiredFieldsForActions,
  signalsClosedFilters,
  signalsDefaultModel,
  signalsOpenFilters,
} from './default_config';
import {
  FILTER_CLOSED,
  FILTER_OPEN,
  SignalFilterOption,
  SignalsTableFilterGroup,
} from './signals_filter_group';
import { SignalsUtilityBar } from './signals_utility_bar';
import * as i18n from './translations';
import {
  CreateTimelineProps,
  SetEventsDeletedProps,
  SetEventsLoadingProps,
  UpdateSignalsStatusCallback,
  UpdateSignalsStatusProps,
} from './types';
import { dispatchUpdateTimeline } from '../../../../components/open_timeline/helpers';

export const SIGNALS_PAGE_TIMELINE_ID = 'signals-page';

interface ReduxProps {
  globalQuery: Query;
  globalFilters: esFilters.Filter[];
  deletedEventIds: string[];
  isSelectAllChecked: boolean;
  loadingEventIds: string[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
}

interface DispatchProps {
  clearEventsDeleted?: ActionCreator<{ id: string }>;
  clearEventsLoading?: ActionCreator<{ id: string }>;
  clearSelected?: ActionCreator<{ id: string }>;
  setEventsDeleted?: ActionCreator<{
    id: string;
    eventIds: string[];
    isDeleted: boolean;
  }>;
  setEventsLoading?: ActionCreator<{
    id: string;
    eventIds: string[];
    isLoading: boolean;
  }>;
  updateTimelineIsLoading: ActionCreator<{ id: string; isLoading: boolean }>;
  updateTimeline: DispatchUpdateTimeline;
}

interface OwnProps {
  canUserCRUD: boolean;
  defaultFilters?: esFilters.Filter[];
  hasIndexWrite: boolean;
  from: number;
  loading: boolean;
  signalsIndex: string;
  to: number;
}

type SignalsTableComponentProps = OwnProps & ReduxProps & DispatchProps;

const SignalsTableComponent: React.FC<SignalsTableComponentProps> = ({
  canUserCRUD,
  clearEventsDeleted,
  clearEventsLoading,
  clearSelected,
  defaultFilters,
  from,
  globalFilters,
  globalQuery,
  hasIndexWrite,
  isSelectAllChecked,
  loading,
  loadingEventIds,
  selectedEventIds,
  setEventsDeleted,
  setEventsLoading,
  signalsIndex,
  to,
  updateTimeline,
  updateTimelineIsLoading,
}) => {
  const [selectAll, setSelectAll] = useState(false);
  const apolloClient = useApolloClient();

  const [showClearSelectionAction, setShowClearSelectionAction] = useState(false);
  const [filterGroup, setFilterGroup] = useState<SignalFilterOption>(FILTER_OPEN);
  const [{ browserFields, indexPatterns }] = useFetchIndexPatterns(
    signalsIndex !== '' ? [signalsIndex] : []
  );
  const kibana = useKibana();

  const getGlobalQuery = useCallback(() => {
    if (browserFields != null && indexPatterns != null) {
      return combineQueries({
        config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
        dataProviders: [],
        indexPattern: indexPatterns,
        browserFields,
        filters: isEmpty(defaultFilters)
          ? globalFilters
          : [...(defaultFilters ?? []), ...globalFilters],
        kqlQuery: globalQuery,
        kqlMode: globalQuery.language,
        start: from,
        end: to,
        isEventViewer: true,
      });
    }
    return null;
  }, [browserFields, globalFilters, globalQuery, indexPatterns, kibana, to, from]);

  // Callback for creating a new timeline -- utilized by row/batch actions
  const createTimelineCallback = useCallback(
    ({ from: fromTimeline, timeline, to: toTimeline }: CreateTimelineProps) => {
      updateTimelineIsLoading({ id: 'timeline-1', isLoading: false });
      updateTimeline({
        duplicate: true,
        from: fromTimeline,
        id: 'timeline-1',
        notes: [],
        timeline: {
          ...timeline,
          show: true,
        },
        to: toTimeline,
      })();
    },
    [updateTimeline, updateTimelineIsLoading]
  );

  const setEventsLoadingCallback = useCallback(
    ({ eventIds, isLoading }: SetEventsLoadingProps) => {
      setEventsLoading!({ id: SIGNALS_PAGE_TIMELINE_ID, eventIds, isLoading });
    },
    [setEventsLoading, SIGNALS_PAGE_TIMELINE_ID]
  );

  const setEventsDeletedCallback = useCallback(
    ({ eventIds, isDeleted }: SetEventsDeletedProps) => {
      setEventsDeleted!({ id: SIGNALS_PAGE_TIMELINE_ID, eventIds, isDeleted });
    },
    [setEventsDeleted, SIGNALS_PAGE_TIMELINE_ID]
  );

  // Catches state change isSelectAllChecked->false upon user selection change to reset utility bar
  useEffect(() => {
    if (!isSelectAllChecked) {
      setShowClearSelectionAction(false);
    } else {
      setSelectAll(false);
    }
  }, [isSelectAllChecked]);

  // Callback for when open/closed filter changes
  const onFilterGroupChangedCallback = useCallback(
    (newFilterGroup: SignalFilterOption) => {
      clearEventsLoading!({ id: SIGNALS_PAGE_TIMELINE_ID });
      clearEventsDeleted!({ id: SIGNALS_PAGE_TIMELINE_ID });
      clearSelected!({ id: SIGNALS_PAGE_TIMELINE_ID });
      setFilterGroup(newFilterGroup);
    },
    [clearEventsLoading, clearEventsDeleted, clearSelected, setFilterGroup]
  );

  // Callback for clearing entire selection from utility bar
  const clearSelectionCallback = useCallback(() => {
    clearSelected!({ id: SIGNALS_PAGE_TIMELINE_ID });
    setSelectAll(false);
    setShowClearSelectionAction(false);
  }, [clearSelected, setSelectAll, setShowClearSelectionAction]);

  // Callback for selecting all events on all pages from utility bar
  // Dispatches to stateful_body's selectAll via TimelineTypeContext props
  // as scope of response data required to actually set selectedEvents
  const selectAllCallback = useCallback(() => {
    setSelectAll(true);
    setShowClearSelectionAction(true);
  }, [setSelectAll, setShowClearSelectionAction]);

  const updateSignalsStatusCallback: UpdateSignalsStatusCallback = useCallback(
    async (refetchQuery: inputsModel.Refetch, { signalIds, status }: UpdateSignalsStatusProps) => {
      await updateSignalStatusAction({
        query: showClearSelectionAction ? getGlobalQuery()?.filterQuery : undefined,
        signalIds: Object.keys(selectedEventIds),
        status,
        setEventsDeleted: setEventsDeletedCallback,
        setEventsLoading: setEventsLoadingCallback,
      });
      refetchQuery();
    },
    [
      getGlobalQuery,
      selectedEventIds,
      setEventsDeletedCallback,
      setEventsLoadingCallback,
      showClearSelectionAction,
    ]
  );

  // Callback for creating the SignalUtilityBar which receives totalCount from EventsViewer component
  const utilityBarCallback = useCallback(
    (refetchQuery: inputsModel.Refetch, totalCount: number) => {
      return (
        <SignalsUtilityBar
          canUserCRUD={canUserCRUD}
          areEventsLoading={loadingEventIds.length > 0}
          clearSelection={clearSelectionCallback}
          hasIndexWrite={hasIndexWrite}
          isFilteredToOpen={filterGroup === FILTER_OPEN}
          selectAll={selectAllCallback}
          selectedEventIds={selectedEventIds}
          showClearSelection={showClearSelectionAction}
          totalCount={totalCount}
          updateSignalsStatus={updateSignalsStatusCallback.bind(null, refetchQuery)}
        />
      );
    },
    [
      canUserCRUD,
      hasIndexWrite,
      clearSelectionCallback,
      filterGroup,
      loadingEventIds.length,
      selectAllCallback,
      selectedEventIds,
      showClearSelectionAction,
      updateSignalsStatusCallback,
    ]
  );

  // Send to Timeline / Update Signal Status Actions for each table row
  const additionalActions = useMemo(
    () =>
      getSignalsActions({
        apolloClient,
        canUserCRUD,
        hasIndexWrite,
        createTimeline: createTimelineCallback,
        setEventsLoading: setEventsLoadingCallback,
        setEventsDeleted: setEventsDeletedCallback,
        status: filterGroup === FILTER_OPEN ? FILTER_CLOSED : FILTER_OPEN,
        updateTimelineIsLoading,
      }),
    [
      apolloClient,
      canUserCRUD,
      createTimelineCallback,
      hasIndexWrite,
      filterGroup,
      setEventsLoadingCallback,
      setEventsDeletedCallback,
      updateTimelineIsLoading,
    ]
  );

  const defaultIndices = useMemo(() => [signalsIndex], [signalsIndex]);
  const defaultFiltersMemo = useMemo(() => {
    if (isEmpty(defaultFilters)) {
      return filterGroup === FILTER_OPEN ? signalsOpenFilters : signalsClosedFilters;
    } else if (defaultFilters != null && !isEmpty(defaultFilters)) {
      return [
        ...defaultFilters,
        ...(filterGroup === FILTER_OPEN ? signalsOpenFilters : signalsClosedFilters),
      ];
    }
  }, [defaultFilters, filterGroup]);

  const timelineTypeContext = useMemo(
    () => ({
      documentType: i18n.SIGNALS_DOCUMENT_TYPE,
      footerText: i18n.TOTAL_COUNT_OF_SIGNALS,
      loadingText: i18n.LOADING_SIGNALS,
      queryFields: requiredFieldsForActions,
      timelineActions: additionalActions,
      title: i18n.SIGNALS_TABLE_TITLE,
      selectAll: canUserCRUD ? selectAll : false,
    }),
    [additionalActions, canUserCRUD, selectAll]
  );

  const headerFilterGroup = useMemo(
    () => <SignalsTableFilterGroup onFilterGroupChanged={onFilterGroupChangedCallback} />,
    [onFilterGroupChangedCallback]
  );

  if (loading || isEmpty(signalsIndex)) {
    return (
      <EuiPanel>
        <HeaderSection title={i18n.SIGNALS_TABLE_TITLE} />
        <EuiLoadingContent />
      </EuiPanel>
    );
  }

  return (
    <StatefulEventsViewer
      defaultIndices={defaultIndices}
      pageFilters={defaultFiltersMemo}
      defaultModel={signalsDefaultModel}
      end={to}
      headerFilterGroup={headerFilterGroup}
      id={SIGNALS_PAGE_TIMELINE_ID}
      start={from}
      timelineTypeContext={timelineTypeContext}
      utilityBar={utilityBarCallback}
    />
  );
};

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getGlobalInputs = inputsSelectors.globalSelector();
  const mapStateToProps = (state: State) => {
    const timeline: TimelineModel =
      getTimeline(state, SIGNALS_PAGE_TIMELINE_ID) ?? timelineDefaults;
    const { deletedEventIds, isSelectAllChecked, loadingEventIds, selectedEventIds } = timeline;

    const globalInputs: inputsModel.InputsRange = getGlobalInputs(state);
    const { query, filters } = globalInputs;
    return {
      globalQuery: query,
      globalFilters: filters,
      deletedEventIds,
      isSelectAllChecked,
      loadingEventIds,
      selectedEventIds,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  clearSelected: ({ id }: { id: string }) => dispatch(timelineActions.clearSelected({ id })),
  setEventsLoading: ({
    id,
    eventIds,
    isLoading,
  }: {
    id: string;
    eventIds: string[];
    isLoading: boolean;
  }) => dispatch(timelineActions.setEventsLoading({ id, eventIds, isLoading })),
  clearEventsLoading: ({ id }: { id: string }) =>
    dispatch(timelineActions.clearEventsLoading({ id })),
  setEventsDeleted: ({
    id,
    eventIds,
    isDeleted,
  }: {
    id: string;
    eventIds: string[];
    isDeleted: boolean;
  }) => dispatch(timelineActions.setEventsDeleted({ id, eventIds, isDeleted })),
  clearEventsDeleted: ({ id }: { id: string }) =>
    dispatch(timelineActions.clearEventsDeleted({ id })),
  updateTimelineIsLoading: ({ id, isLoading }: { id: string; isLoading: boolean }) =>
    dispatch(timelineActions.updateIsLoading({ id, isLoading })),
  updateTimeline: dispatchUpdateTimeline(dispatch),
});

export const SignalsTable = connect(
  makeMapStateToProps,
  mapDispatchToProps
)(React.memo(SignalsTableComponent));
