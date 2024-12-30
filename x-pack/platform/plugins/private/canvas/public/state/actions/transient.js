/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';

export const setFullscreen = createAction('setFullscreen');
export const selectToplevelNodes = createAction('selectToplevelNodes');
export const setFirstLoad = createAction('setFirstLoad');
export const setElementStats = createAction('setElementStats');
export const setZoomScale = createAction('setZoomScale');
