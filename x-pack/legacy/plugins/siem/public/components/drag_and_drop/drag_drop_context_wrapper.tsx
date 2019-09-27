/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultTo, noop } from 'lodash/fp';
import * as React from 'react';
import { DragDropContext, DropResult, DragStart } from 'react-beautiful-dnd';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';

import { BrowserFields } from '../../containers/source';
import { dragAndDropModel, dragAndDropSelectors } from '../../store';
import { IdToDataProvider } from '../../store/drag_and_drop/model';
import { State } from '../../store/reducer';

import {
  addFieldToTimelineColumns,
  addProviderToTimeline,
  fieldWasDroppedOnTimelineColumns,
  IS_DRAGGING_CLASS_NAME,
  providerWasDroppedOnTimeline,
  providerWasDroppedOnTimelineButton,
  draggableIsField,
} from './helpers';

interface Props {
  browserFields: BrowserFields;
  children: React.ReactNode;
  dataProviders?: dragAndDropModel.IdToDataProvider;
  dispatch: Dispatch;
}

interface OnDragEndHandlerParams {
  browserFields: BrowserFields;
  dataProviders: IdToDataProvider;
  dispatch: Dispatch;
  result: DropResult;
}

const onDragEndHandler = ({
  browserFields,
  dataProviders,
  dispatch,
  result,
}: OnDragEndHandlerParams) => {
  if (providerWasDroppedOnTimeline(result)) {
    addProviderToTimeline({ dataProviders, result, dispatch });
  } else if (providerWasDroppedOnTimelineButton(result)) {
    addProviderToTimeline({ dataProviders, result, dispatch });
  } else if (fieldWasDroppedOnTimelineColumns(result)) {
    addFieldToTimelineColumns({ browserFields, dispatch, result });
  }
};

/**
 * DragDropContextWrapperComponent handles all drag end events
 */
export const DragDropContextWrapperComponent = React.memo<Props>(
  ({ browserFields, children, dataProviders, dispatch }) => {
    function onDragEnd(result: DropResult) {
      enableScrolling();

      if (dataProviders != null) {
        onDragEndHandler({
          browserFields,
          result,
          dataProviders,
          dispatch,
        });
      }

      if (!draggableIsField(result)) {
        document.body.classList.remove(IS_DRAGGING_CLASS_NAME);
      }
    }
    return (
      <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
        {children}
      </DragDropContext>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.children === nextProps.children &&
      prevProps.dataProviders === nextProps.dataProviders
    ); // prevent re-renders when data providers are added or removed, but all other props are the same
  }
);

DragDropContextWrapperComponent.displayName = 'DragDropContextWrapperComponent';

const emptyDataProviders: dragAndDropModel.IdToDataProvider = {}; // stable reference

const mapStateToProps = (state: State) => {
  const dataProviders = defaultTo(
    emptyDataProviders,
    dragAndDropSelectors.dataProvidersSelector(state)
  );

  return { dataProviders };
};

export const DragDropContextWrapper = connect(mapStateToProps)(DragDropContextWrapperComponent);

const onDragStart = (initial: DragStart) => {
  const x =
    window.pageXOffset !== undefined
      ? window.pageXOffset
      : (document.documentElement || document.body.parentNode || document.body).scrollLeft;

  const y =
    window.pageYOffset !== undefined
      ? window.pageYOffset
      : (document.documentElement || document.body.parentNode || document.body).scrollTop;

  window.onscroll = () => window.scrollTo(x, y);

  if (!draggableIsField(initial)) {
    document.body.classList.add(IS_DRAGGING_CLASS_NAME);
  }
};

const enableScrolling = () => (window.onscroll = () => noop);
