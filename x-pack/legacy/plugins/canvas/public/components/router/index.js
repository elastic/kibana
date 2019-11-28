/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { setFullscreen } from '../../state/actions/transient';
import {
  enableAutoplay,
  setRefreshInterval,
  setAutoplayInterval,
} from '../../state/actions/workpad';
import { Router as Component } from './router';

const mapDispatchToState = {
  enableAutoplay,
  setAutoplayInterval,
  setFullscreen,
  setRefreshInterval,
};

export const Router = connect(null, mapDispatchToState)(Component);
