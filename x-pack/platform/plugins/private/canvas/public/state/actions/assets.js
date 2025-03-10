/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';

export const setAssetValue = createAction('setAssetContent', (id, value) => ({ id, value }));
export const setAsset = createAction('setAsset', (asset) => ({ asset }));
export const removeAsset = createAction('removeAsset');
export const setAssets = createAction('setAssets');
export const resetAssets = createAction('resetAssets');
