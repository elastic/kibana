/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { setFullscreen, selectToplevelNodes } from '../../../state/actions/transient';
import { enableAutoplay } from '../../../state/actions/workpad';
import { getFullscreen } from '../../../state/selectors/app';
import { getAutoplay } from '../../../state/selectors/workpad';
import { FullscreenControl as Component } from './fullscreen_control';

const mapStateToProps = state => ({
  isFullscreen: getFullscreen(state),
  autoplayEnabled: getAutoplay(state).enabled,
});

const mapDispatchToProps = dispatch => ({
  setFullscreen: value => {
    dispatch(setFullscreen(value));
    value && dispatch(selectToplevelNodes([]));
  },
  enableAutoplay: enabled => dispatch(enableAutoplay(enabled)),
});

export const FullscreenControl = connect(
  mapStateToProps,
  mapDispatchToProps
)(Component);
