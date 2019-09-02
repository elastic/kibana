/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { WithSource } from '../../containers/source';
import { inputsModel, inputsSelectors, State, timelineSelectors } from '../../store';
import { timelineActions } from '../../store/actions';
import { KqlMode, TimelineModel } from '../../store/timeline/model';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';
import { DataProvider } from '../timeline/data_providers/data_provider';
import { Sort } from '../timeline/body/sort';
import { OnChangeItemsPerPage } from '../timeline/events';

import { EventsViewer } from './events_viewer';
import { defaultHeaders } from './default_headers';

export interface OwnProps {
  end: number;
  id: string;
  kqlQueryExpression: string;
  start: number;
}

interface StateReduxProps {
  activePage?: number;
  columns: ColumnHeader[];
  dataProviders?: DataProvider[];
  isLive: boolean;
  itemsPerPage?: number;
  itemsPerPageOptions?: number[];
  kqlMode: KqlMode;
  pageCount?: number;
  sort?: Sort;
}

interface DispatchProps {
  createTimeline: ActionCreator<{
    id: string;
    columns: ColumnHeader[];
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
    end,
    id,
    isLive,
    itemsPerPage,
    itemsPerPageOptions,
    kqlMode,
    kqlQueryExpression,
    removeColumn,
    start,
    sort,
    updateItemsPerPage,
    upsertColumn,
  }) => {
    const [showInspect, setShowInspect] = useState<boolean>(false);

    useEffect(() => {
      if (createTimeline != null) {
        createTimeline({ id, columns: defaultHeaders });
      }
    }, []);

    const onChangeItemsPerPage: OnChangeItemsPerPage = itemsChangedPerPage =>
      updateItemsPerPage({ id, itemsPerPage: itemsChangedPerPage });

    const toggleColumn = (column: ColumnHeader) => {
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
    };

    return (
      <WithSource sourceId="default">
        {({ indexPattern, browserFields }) => (
          <div onMouseEnter={() => setShowInspect(true)} onMouseLeave={() => setShowInspect(false)}>
            <EventsViewer
              browserFields={browserFields}
              columns={columns}
              id={id}
              dataProviders={dataProviders!}
              end={end}
              indexPattern={indexPattern}
              isLive={isLive}
              itemsPerPage={itemsPerPage!}
              itemsPerPageOptions={itemsPerPageOptions!}
              kqlMode={kqlMode}
              kqlQueryExpression={kqlQueryExpression}
              onChangeItemsPerPage={onChangeItemsPerPage}
              showInspect={showInspect}
              start={start}
              sort={sort!}
              toggleColumn={toggleColumn}
            />
          </div>
        )}
      </WithSource>
    );
  },
  (prevProps, nextProps) =>
    prevProps.id === nextProps.id &&
    prevProps.activePage === nextProps.activePage &&
    isEqual(prevProps.columns, nextProps.columns) &&
    isEqual(prevProps.dataProviders, nextProps.dataProviders) &&
    prevProps.end === nextProps.end &&
    prevProps.isLive === nextProps.isLive &&
    prevProps.itemsPerPage === nextProps.itemsPerPage &&
    isEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions) &&
    prevProps.kqlMode === nextProps.kqlMode &&
    prevProps.kqlQueryExpression === nextProps.kqlQueryExpression &&
    prevProps.pageCount === nextProps.pageCount &&
    isEqual(prevProps.sort, nextProps.sort) &&
    prevProps.start === nextProps.start
);

StatefulEventsViewerComponent.displayName = 'StatefulEventsViewerComponent';

const makeMapStateToProps = () => {
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State, { id }: OwnProps) => {
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const timeline: TimelineModel = getTimeline(state, id);
    const { columns, dataProviders, itemsPerPage, itemsPerPageOptions, kqlMode, sort } = timeline;

    return {
      columns,
      dataProviders,
      id,
      isLive: input.policy.kind === 'interval',
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      sort,
    };
  };
  return mapStateToProps;
};

export const StatefulEventsViewer = connect(
  makeMapStateToProps,
  {
    createTimeline: timelineActions.createTimeline,
    updateItemsPerPage: timelineActions.updateItemsPerPage,
    updateSort: timelineActions.updateSort,
    removeColumn: timelineActions.removeColumn,
    upsertColumn: timelineActions.upsertColumn,
  }
)(StatefulEventsViewerComponent);
