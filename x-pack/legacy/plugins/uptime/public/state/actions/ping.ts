/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { GetPingHistogramParams, HistogramResult } from '../../../common/types';

export const getPingHistogram = createAction<GetPingHistogramParams>('GET_PING_HISTOGRAM');
export const getPingHistogramSuccess = createAction<HistogramResult>('GET_PING_HISTOGRAM_SUCCESS');
export const getPingHistogramFail = createAction<Error>('GET_PING_HISTOGRAM_FAIL');
