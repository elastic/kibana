/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import {
  setRefreshInterval,
  enableAutoplay,
  setAutoplayInterval,
} from '../../../state/actions/workpad';
import { getRefreshInterval, getAutoplay } from '../../../state/selectors/workpad';
import { ControlSettings as Component } from './control_settings';

const mapStateToProps = state => {
  const { enabled, interval } = getAutoplay(state);

  return {
    refreshInterval: getRefreshInterval(state),
    autoplayEnabled: enabled,
    autoplayInterval: interval,
  };
};

const mapDispatchToProps = {
  setRefreshInterval,
  enableAutoplay,
  setAutoplayInterval,
};

export const ControlSettings = connect(
  mapStateToProps,
  mapDispatchToProps
)(Component);
