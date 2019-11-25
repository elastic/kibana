/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withHandlers } from 'recompose';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { getZoomScale } from '../../../state/selectors/app';
import {
  getWorkpadBoundingBox,
  getWorkpadWidth,
  getWorkpadHeight,
} from '../../../state/selectors/workpad';
// @ts-ignore unconverted local file
import { setZoomScale } from '../../../state/actions/transient';
import { zoomHandlerCreators } from '../../../lib/app_handler_creators';
import { WorkpadZoom as Component, Props as ComponentProps } from './workpad_zoom';
import { State } from '../../../../types';

const mapStateToProps = (state: State) => {
  return {
    zoomScale: getZoomScale(state),
    boundingBox: getWorkpadBoundingBox(state),
    workpadWidth: getWorkpadWidth(state),
    workpadHeight: getWorkpadHeight(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  setZoomScale: (scale: number) => dispatch(setZoomScale(scale)),
});

export const WorkpadZoom = compose<ComponentProps, {}>(
  connect(mapStateToProps, mapDispatchToProps),
  withHandlers(zoomHandlerCreators)
)(Component);
