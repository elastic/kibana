/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import { SignalsUtilityBar } from './components/signals_utility_bar';
import { GlobalTime } from '../../../containers/global_time';
import { StatefulEventsViewer } from '../../../components/events_viewer';
import * as i18n from './translations';
import {
  getSignalsActions,
  requiredFieldsForActions,
  signalsClosedFilters,
  signalsDefaultModel,
  signalsOpenFilters,
} from './default_config';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { timelineDefaults, TimelineModel } from '../../../store/timeline/model';
import {
  FILTER_CLOSED,
  FILTER_OPEN,
  SignalFilterOption,
  SignalsTableFilterGroup,
} from './components/signals_filter_group/signals_filter_group';
import { useKibanaUiSetting } from '../../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_KBN_VERSION } from '../../../../common/constants';
import { defaultHeaders } from '../../../components/timeline/body/column_headers/default_headers';
import { ColumnHeader } from '../../../components/timeline/body/column_headers/column_header';
import { esFilters } from '../../../../../../../../src/plugins/data/common/es_query';
import { TimelineNonEcsData } from '../../../graphql/types';
import { SerializedFilterQuery, State } from '../../../store';
import { sendSignalsToTimelineAction, updateSignalStatusAction } from './actions';
import {
  CreateTimelineProps,
  SendSignalsToTimeline,
  SetEventsDeletedProps,
  SetEventsLoadingProps,
  UpdateSignalsStatus,
  UpdateSignalsStatusProps,
} from './types';
import { inputsActions } from '../../../store/inputs';

const SIGNALS_PAGE_TIMELINE_ID = 'signals-page';

function usePrevious(value: number) {
  const ref = useRef<number>();
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

interface ReduxProps {
  deletedEventIds: string[];
  loadingEventIds: string[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
}

interface DispatchProps {
  createTimeline: ActionCreator<{
    dateRange?: {
      start: number;
      end: number;
    };
    filters?: esFilters.Filter[];
    id: string;
    kqlQuery?: {
      filterQuery: SerializedFilterQuery | null;
    };
    columns: ColumnHeader[];
    show?: boolean;
  }>;
  clearEventsDeleted?: ActionCreator<{ id: string }>;
  clearEventsLoading?: ActionCreator<{ id: string }>;
  clearSelected?: ActionCreator<{ id: string }>;
  removeTimelineLinkTo: ActionCreator<{}>;
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
  setSelected?: ActionCreator<{
    id: string;
    eventIds: Record<string, TimelineNonEcsData[]>;
    isSelected: boolean;
  }>;
}

type SignalsTableComponentProps = ReduxProps & DispatchProps;

export const SignalsTableComponent = React.memo<SignalsTableComponentProps>(
  ({
    createTimeline,
    clearEventsDeleted,
    clearEventsLoading,
    clearSelected,
    loadingEventIds,
    removeTimelineLinkTo,
    selectedEventIds,
    setEventsDeleted,
    setEventsLoading,
    setSelected,
  }) => {
    const [selectAll, setSelectAll] = useState<boolean>(false);

    const [showClearSelectionAction, setShowClearSelectionAction] = useState(false);
    const [filterGroup, setFilterGroup] = useState<SignalFilterOption>(FILTER_OPEN);
    const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);

    const previousSelectedCount = usePrevious(Object.keys(selectedEventIds).length);

    // Callback for creating a new timeline -- utilized by row/batch actions
    const createTimelineCallback = useCallback(
      ({ id, kqlQuery, filters, dateRange }: CreateTimelineProps) => {
        removeTimelineLinkTo({});
        createTimeline({ id, columns: defaultHeaders, show: true, filters, dateRange, kqlQuery });
      },
      [createTimeline, removeTimelineLinkTo]
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

    // Catches state change to selectAll->false upon user selection change
    useEffect(() => {
      if (Object.keys(selectedEventIds).length !== previousSelectedCount?.current && selectAll) {
        setShowClearSelectionAction(false);
      }
    }, [previousSelectedCount, Object.keys(selectedEventIds).length, selectAll]);

    // Callback for when open/closed filter changes
    const onFilterGroupChangedCallback = useCallback(
      (newFilterGroup: SignalFilterOption) => {
        clearEventsLoading!({ id: SIGNALS_PAGE_TIMELINE_ID });
        clearEventsDeleted!({ id: SIGNALS_PAGE_TIMELINE_ID });
        clearSelected!({ id: SIGNALS_PAGE_TIMELINE_ID });
        setFilterGroup(newFilterGroup);
      },
      [setFilterGroup]
    );

    // Callback for clearing entire selection from utility bar
    const clearSelectionCallback = useCallback(() => {
      clearSelected!({ id: SIGNALS_PAGE_TIMELINE_ID });
      setShowClearSelectionAction(false);
    }, [setSelected, setShowClearSelectionAction]);

    // Callback for selecting all events on all pages from utility bar
    // Dispatches to stateful_body's selectAll via TimelineTypeContext props
    // as scope of response data required to actually set selectedEvents
    const selectAllCallback = useCallback(() => {
      setSelectAll(!selectAll);
      setShowClearSelectionAction(true);
    }, [setSelectAll, setShowClearSelectionAction]);

    const updateSignalsStatusCallback: UpdateSignalsStatus = useCallback(
      async ({ signalIds, status }: UpdateSignalsStatusProps) => {
        await updateSignalStatusAction({
          signalIds: Object.keys(selectedEventIds),
          status,
          setEventsDeleted: setEventsDeletedCallback,
          setEventsLoading: setEventsLoadingCallback,
          kbnVersion,
        });
      },
      [selectedEventIds, setEventsDeletedCallback, setEventsLoadingCallback]
    );
    const sendSignalsToTimelineCallback: SendSignalsToTimeline = useCallback(async () => {
      // TODO: Update data to use all signals
      await sendSignalsToTimelineAction({
        createTimeline: createTimelineCallback,
        data: Object.values(selectedEventIds)[0],
      });
    }, [selectedEventIds, setEventsDeletedCallback, setEventsLoadingCallback]);

    // Callback for creating the SignalUtilityBar which receives totalCount from EventsViewer component
    const utilityBarCallback = useCallback(
      (totalCount: number) => {
        return (
          <SignalsUtilityBar
            areEventsLoading={loadingEventIds.length > 0}
            clearSelection={clearSelectionCallback}
            isFilteredToOpen={filterGroup === FILTER_OPEN}
            selectAll={selectAllCallback}
            selectedEventIds={selectedEventIds}
            sendSignalsToTimeline={sendSignalsToTimelineCallback}
            showClearSelection={showClearSelectionAction}
            totalCount={totalCount}
            updateSignalsStatus={updateSignalsStatusCallback}
          />
        );
      },
      [
        clearSelectionCallback,
        filterGroup,
        loadingEventIds.length,
        selectAllCallback,
        selectedEventIds,
        showClearSelectionAction,
      ]
    );

    // Send to Timeline / Update Signal Status Actions for each table row
    const additionalActions = useMemo(
      () =>
        getSignalsActions({
          createTimeline: createTimelineCallback,
          setEventsLoading: setEventsLoadingCallback,
          setEventsDeleted: setEventsDeletedCallback,
          status: filterGroup === FILTER_OPEN ? FILTER_CLOSED : FILTER_OPEN,
          kbnVersion,
        }),
      [createTimelineCallback, filterGroup, kbnVersion]
    );

    return (
      <>
        <GlobalTime>
          {({ to, from }) => (
            <StatefulEventsViewer
              defaultIndices={['.siem-signals-spong-default']} // TODO Get from new FrankInspired XavierHook
              defaultFilters={
                filterGroup === FILTER_OPEN ? signalsOpenFilters : signalsClosedFilters
              }
              defaultModel={signalsDefaultModel}
              end={to}
              headerFilterGroup={
                <SignalsTableFilterGroup onFilterGroupChanged={onFilterGroupChangedCallback} />
              }
              id={SIGNALS_PAGE_TIMELINE_ID}
              start={from}
              timelineTypeContext={{
                documentType: i18n.SIGNALS_DOCUMENT_TYPE,
                footerText: i18n.TOTAL_COUNT_OF_SIGNALS,
                loadingText: i18n.LOADING_SIGNALS,
                queryFields: requiredFieldsForActions,
                timelineActions: additionalActions,
                title: i18n.SIGNALS_TABLE_TITLE,
                selectAll,
              }}
              utilityBar={utilityBarCallback}
            />
          )}
        </GlobalTime>
      </>
    );
  }
);

SignalsTableComponent.displayName = 'SignalsTableComponent';

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State) => {
    const timeline: TimelineModel =
      getTimeline(state, SIGNALS_PAGE_TIMELINE_ID) ?? timelineDefaults;
    const { deletedEventIds, loadingEventIds, selectedEventIds } = timeline;

    return {
      deletedEventIds,
      loadingEventIds,
      selectedEventIds,
    };
  };
  return mapStateToProps;
};

export const SignalsTable = connect(makeMapStateToProps, {
  removeTimelineLinkTo: inputsActions.removeTimelineLinkTo,
  setSelected: timelineActions.setSelected,
  clearSelected: timelineActions.clearSelected,
  setEventsLoading: timelineActions.setEventsLoading,
  clearEventsLoading: timelineActions.clearEventsLoading,
  setEventsDeleted: timelineActions.setEventsDeleted,
  clearEventsDeleted: timelineActions.clearEventsDeleted,
  createTimeline: timelineActions.createTimeline,
})(SignalsTableComponent);
