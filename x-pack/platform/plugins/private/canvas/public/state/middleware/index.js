/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyMiddleware, compose as reduxCompose } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { getWindow } from '../../lib/get_window';
import { inFlight } from './in_flight';
import { workpadUpdate } from './workpad_update';
import { elementStats } from './element_stats';
import { resolvedArgs } from './resolved_args';

const middlewares = [
  applyMiddleware(thunkMiddleware, elementStats, resolvedArgs, inFlight, workpadUpdate),
];

// compose with redux devtools, if extension is installed
const compose = getWindow().__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || reduxCompose;

export const middleware = compose(...middlewares);
