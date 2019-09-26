/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export const undoHistory = createAction('undoHistory');
export const redoHistory = createAction('redoHistory');
export const restoreHistory = createAction('restoreHistory');
