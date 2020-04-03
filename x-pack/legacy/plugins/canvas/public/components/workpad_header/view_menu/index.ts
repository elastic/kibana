/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, withHandlers } from 'recompose';
import { Dispatch } from 'redux';
import { withKibana } from '../../../../../../../../src/plugins/kibana_react/public/';
import { zoomHandlerCreators } from '../../../lib/app_handler_creators';
// @ts-ignore Untyped local

import { State, CanvasWorkpadBoundingBox } from '../../../../types';
// @ts-ignore Untyped local
import { fetch, arrayBufferFetch } from '../../../../common/lib/fetch';
// @ts-ignore Untyped local
import { notify } from '../../../lib/notify';
// @ts-ignore Untyped local
import { setZoomScale, setFullscreen, selectToplevelNodes } from '../../../state/actions/transient';
// @ts-ignore Untyped local
import { setWriteable } from '../../../state/actions/workpad';
import { getZoomScale, canUserWrite } from '../../../state/selectors/app';
import {
  getWorkpadBoundingBox,
  getWorkpadWidth,
  getWorkpadHeight,
  isWriteable,
} from '../../../state/selectors/workpad';
// @ts-ignore Untyped local
import { fetchAllRenderables } from '../../../state/actions/elements';
import { ViewMenu as Component, Props as ComponentProps } from './view_menu';
import { getFitZoomScale } from './get_fit_zoom_scale';

interface StateProps {
  zoomScale: number;
  boundingBox: CanvasWorkpadBoundingBox;
  workpadWidth: number;
  workpadHeight: number;
  isWriteable: boolean;
}

interface DispatchProps {
  setWriteable: (isWorkpadWriteable: boolean) => void;
  setZoomScale: (scale: number) => void;
  setFullscreen: (showFullscreen: boolean) => void;
}

const mapStateToProps = (state: State) => ({
  zoomScale: getZoomScale(state),
  boundingBox: getWorkpadBoundingBox(state),
  workpadWidth: getWorkpadWidth(state),
  workpadHeight: getWorkpadHeight(state),
  isWriteable: isWriteable(state) && canUserWrite(state),
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  setZoomScale: (scale: number) => dispatch(setZoomScale(scale)),
  setWriteable: (isWorkpadWriteable: boolean) => dispatch(setWriteable(isWorkpadWriteable)),
  setFullscreen: (value: boolean) => {
    dispatch(setFullscreen(value));
    if (value) {
      dispatch(selectToplevelNodes([]));
    }
  },
  doRefresh: () => dispatch(fetchAllRenderables()),
});

const mergeProps = (
  stateProps: StateProps,
  dispatchProps: DispatchProps,
  ownProps: ComponentProps
): ComponentProps => {
  const { boundingBox, workpadWidth, workpadHeight, ...remainingStateProps } = stateProps;
  return {
    ...remainingStateProps,
    ...dispatchProps,
    ...ownProps,
    toggleWriteable: () => dispatchProps.setWriteable(!stateProps.isWriteable),
    enterFullscreen: () => dispatchProps.setFullscreen(true),
    fitToWindow: () => getFitZoomScale(boundingBox, workpadWidth, workpadHeight),
  };
};

export const ViewMenu = compose<ComponentProps, {}>(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withKibana,
  withHandlers(zoomHandlerCreators)
)(Component);
