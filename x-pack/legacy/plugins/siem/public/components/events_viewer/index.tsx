/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';
import { inputsModel, inputsSelectors, State, timelineSelectors } from '../../store';
import { inputsActions, timelineActions } from '../../store/actions';
import { KqlMode, SubsetTimelineModel, TimelineModel } from '../../store/timeline/model';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import { DataProvider } from '../timeline/data_providers/data_provider';
import { Sort } from '../timeline/body/sort';
import { OnChangeItemsPerPage } from '../timeline/events';
import { esFilters, Query } from '../../../../../../../src/plugins/data/public';

import { useUiSetting } from '../../lib/kibana';
import { EventsViewer } from './events_viewer';
import { InputsModelId } from '../../store/inputs/constants';
import { useFetchIndexPatterns } from '../../containers/detection_engine/rules/fetch_index_patterns';
import { TimelineTypeContextProps } from '../timeline/timeline_context';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';

export interface OwnProps {
  defaultIndices?: string[];
  defaultFilters?: esFilters.Filter[];
  defaultModel: SubsetTimelineModel;
  end: number;
  id: string;
  start: number;
  headerFilterGroup?: React.ReactNode;
  pageFilters?: esFilters.Filter[];
  timelineTypeContext?: TimelineTypeContextProps;
  utilityBar?: (totalCount: number) => React.ReactNode;
}

interface StateReduxProps {
  activePage?: number;
  columns: ColumnHeader[];
  dataProviders?: DataProvider[];
  filters: esFilters.Filter[];
  isLive: boolean;
  itemsPerPage?: number;
  itemsPerPageOptions?: number[];
  kqlMode: KqlMode;
  query: Query;
  pageCount?: number;
  sort?: Sort;
}

interface DispatchProps {
  createTimeline: ActionCreator<{
    id: string;
    columns: ColumnHeader[];
    itemsPerPage?: number;
    sort?: Sort;
  }>;
  deleteEventQuery: ActionCreator<{
    id: string;
    inputId: InputsModelId;
  }>;
  removeColumn: ActionCreator<{
    id: string;
    columnId: string;
  }>;
  updateItemsPerPage: ActionCreator<{
    id: string;
    itemsPerPage: number;
  }>;
  upsertColumn: ActionCreator<{
    column: ColumnHeader;
    id: string;
    index: number;
  }>;
}

type Props = OwnProps & StateReduxProps & DispatchProps;

const StatefulEventsViewerComponent = React.memo<Props>(
  ({
    createTimeline,
    columns,
    dataProviders,
    defaultFilters = [],
    defaultModel,
    defaultIndices,
    deleteEventQuery,
    end,
    filters,
    headerFilterGroup,
    id,
    isLive,
    itemsPerPage,
    itemsPerPageOptions,
    kqlMode,
    query,
    removeColumn,
    start,
    sort,
    timelineTypeContext = {
      showCheckboxes: false,
      showRowRenderers: true,
    },
    updateItemsPerPage,
    upsertColumn,
    utilityBar,
  }) => {
    const [showInspect, setShowInspect] = useState(false);
    const [{ browserFields, indexPatterns }] = useFetchIndexPatterns(
      defaultIndices ?? useUiSetting<string[]>(DEFAULT_INDEX_KEY)
    );

    useEffect(() => {
      if (createTimeline != null) {
        createTimeline({ id, columns, sort, itemsPerPage });
      }
      return () => {
        deleteEventQuery({ id, inputId: 'global' });
      };
    }, []);

    const onChangeItemsPerPage: OnChangeItemsPerPage = useCallback(
      itemsChangedPerPage => updateItemsPerPage({ id, itemsPerPage: itemsChangedPerPage }),
      [id, updateItemsPerPage]
    );

    const toggleColumn = useCallback(
      (column: ColumnHeader) => {
        const exists = columns.findIndex(c => c.id === column.id) !== -1;

        if (!exists && upsertColumn != null) {
          upsertColumn({
            column,
            id,
            index: 1,
          });
        }

        if (exists && removeColumn != null) {
          removeColumn({
            columnId: column.id,
            id,
          });
        }
      },
      [columns, id, upsertColumn, removeColumn]
    );

    const handleOnMouseEnter = useCallback(() => setShowInspect(true), []);
    const handleOnMouseLeave = useCallback(() => setShowInspect(false), []);
    const eventsFilter = useMemo(() => [...filters], [defaultFilters]);
    return (
      <div onMouseEnter={handleOnMouseEnter} onMouseLeave={handleOnMouseLeave}>
        <EventsViewer
          browserFields={browserFields ?? {}}
          columns={columns}
          id={id}
          dataProviders={dataProviders!}
          end={end}
          filters={eventsFilter}
          headerFilterGroup={headerFilterGroup}
          indexPattern={indexPatterns ?? { fields: [], title: '' }}
          isLive={isLive}
          itemsPerPage={itemsPerPage!}
          itemsPerPageOptions={itemsPerPageOptions!}
          kqlMode={kqlMode}
          onChangeItemsPerPage={onChangeItemsPerPage}
          query={query}
          showInspect={showInspect}
          start={start}
          sort={sort!}
          timelineTypeContext={timelineTypeContext}
          toggleColumn={toggleColumn}
          utilityBar={utilityBar}
        />
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.id === nextProps.id &&
    prevProps.activePage === nextProps.activePage &&
    isEqual(prevProps.columns, nextProps.columns) &&
    isEqual(prevProps.dataProviders, nextProps.dataProviders) &&
    prevProps.end === nextProps.end &&
    isEqual(prevProps.filters, nextProps.filters) &&
    prevProps.isLive === nextProps.isLive &&
    prevProps.itemsPerPage === nextProps.itemsPerPage &&
    isEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions) &&
    prevProps.kqlMode === nextProps.kqlMode &&
    isEqual(prevProps.query, nextProps.query) &&
    prevProps.pageCount === nextProps.pageCount &&
    isEqual(prevProps.sort, nextProps.sort) &&
    prevProps.start === nextProps.start &&
    isEqual(prevProps.defaultFilters, nextProps.defaultFilters)
);

StatefulEventsViewerComponent.displayName = 'StatefulEventsViewerComponent';

const makeMapStateToProps = () => {
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const getEvents = timelineSelectors.getEventsByIdSelector();
  const mapStateToProps = (state: State, { id, defaultFilters = [], defaultModel }: OwnProps) => {
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const events: TimelineModel = getEvents(state, id) ?? defaultModel;
    const { columns, dataProviders, itemsPerPage, itemsPerPageOptions, kqlMode, sort } = events;

    return {
      columns,
      dataProviders,
      filters: [...getGlobalFiltersQuerySelector(state), ...defaultFilters],
      id,
      isLive: input.policy.kind === 'interval',
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      query: getGlobalQuerySelector(state),
      sort,
    };
  };
  return mapStateToProps;
};

export const StatefulEventsViewer = connect(makeMapStateToProps, {
  createTimeline: timelineActions.createTimeline,
  deleteEventQuery: inputsActions.deleteOneQuery,
  updateItemsPerPage: timelineActions.updateItemsPerPage,
  removeColumn: timelineActions.removeColumn,
  upsertColumn: timelineActions.upsertColumn,
  setSearchBarFilter: inputsActions.setSearchBarFilter,
})(StatefulEventsViewerComponent);
