/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultTo, noop } from 'lodash/fp';
import React, { useCallback } from 'react';
import { DropResult, DragDropContext } from 'react-beautiful-dnd';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';

import { BeforeCapture } from './drag_drop_context';
import { BrowserFields } from '../../containers/source';
import { dragAndDropModel, dragAndDropSelectors } from '../../store';
import { IdToDataProvider } from '../../store/drag_and_drop/model';
import { State } from '../../store/reducer';

import {
  addFieldToTimelineColumns,
  addProviderToTimeline,
  fieldWasDroppedOnTimelineColumns,
  IS_DRAGGING_CLASS_NAME,
  IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME,
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
    const onDragEnd = useCallback(
      (result: DropResult) => {
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

        if (draggableIsField(result)) {
          document.body.classList.remove(IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME);
        }
      },
      [browserFields, dataProviders]
    );
    return (
      // @ts-ignore
      <DragDropContext onDragEnd={onDragEnd} onBeforeCapture={onBeforeCapture}>
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

DragDropContextWrapper.displayName = 'DragDropContextWrapper';

const onBeforeCapture = (before: BeforeCapture) => {
  const x =
    window.pageXOffset !== undefined
      ? window.pageXOffset
      : (document.documentElement || document.body.parentNode || document.body).scrollLeft;

  const y =
    window.pageYOffset !== undefined
      ? window.pageYOffset
      : (document.documentElement || document.body.parentNode || document.body).scrollTop;

  window.onscroll = () => window.scrollTo(x, y);

  if (!draggableIsField(before)) {
    document.body.classList.add(IS_DRAGGING_CLASS_NAME);
  }

  if (draggableIsField(before)) {
    document.body.classList.add(IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME);
  }
};

const enableScrolling = () => (window.onscroll = () => noop);
