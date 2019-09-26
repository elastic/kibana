/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export const routePathChange = createAction('ROUTE PATH CHANGE');
export const repoChange = createAction<string>('REPOSITORY CHANGE');
export const revisionChange = createAction('REVISION CHANGE');
export const filePathChange = createAction('FILE PATH CHANGE');
