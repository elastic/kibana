/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export const openDetailPanel = createAction('INDEX_MANAGEMENT_OPEN_DETAIL_PANEL');
export const closeDetailPanel = createAction('INDEX_MANAGEMENT_CLOSE_DETAIL_PANEL');
