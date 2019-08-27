/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Mustache from 'mustache';
import { isString, cloneDeep } from 'lodash';
import { AlertActionParams, State, Context } from '../types';

export function transformActionParams(params: AlertActionParams, state: State, context: Context) {
  return cloneDeep(params, value => {
    if (!isString(value)) return;

    return Mustache.render(value, { context, state });
  });
}
