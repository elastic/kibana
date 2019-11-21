/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { applyMiddleware, compose as reduxCompose } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { getWindow } from '../../lib/get_window';
import { breadcrumbs } from './breadcrumbs';
import { esPersistMiddleware } from './es_persist';
import { fullscreen } from './fullscreen';
import { historyMiddleware } from './history';
import { inFlight } from './in_flight';
import { workpadUpdate } from './workpad_update';
import { workpadRefresh } from './workpad_refresh';
import { workpadAutoplay } from './workpad_autoplay';
import { appReady } from './app_ready';
import { elementStats } from './element_stats';
import { resolvedArgs } from './resolved_args';

const middlewares = [
  applyMiddleware(
    thunkMiddleware,
    elementStats,
    resolvedArgs,
    esPersistMiddleware,
    historyMiddleware,
    breadcrumbs,
    fullscreen,
    inFlight,
    appReady,
    workpadUpdate,
    workpadRefresh,
    workpadAutoplay
  ),
];

// compose with redux devtools, if extension is installed
const compose = getWindow().__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || reduxCompose;

export const middleware = compose(...middlewares);
