/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IHttpFetchError } from '../../../../../../../target/types/core/public/http';

export interface IReducerState {
  errors: IHttpFetchError[];
  loading: boolean;
}

export interface AsyncInitialState<StateType> {
  data: StateType;
  loading: boolean;
  error?: IHttpFetchError | null;
}
