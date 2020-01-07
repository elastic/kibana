/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Mustache from 'mustache';
import { isString, cloneDeep } from 'lodash';
import { AlertActionParams, State, Context } from '../types';

interface TransformActionParamsOptions {
  alertId: string;
  alertInstanceId: string;
  params: AlertActionParams;
  state: State;
  context: Context;
}

export function transformActionParams({
  alertId,
  alertInstanceId,
  context,
  params,
  state,
}: TransformActionParamsOptions): AlertActionParams {
  const result = cloneDeep(params, (value: any) => {
    if (!isString(value)) return;

    return Mustache.render(value, { alertId, alertInstanceId, context, state });
  });

  // The return type signature for `cloneDeep()` ends up taking the return
  // type signature for the customizer, but rather than pollute the customizer
  // with casts, seemed better to just do it in one place, here.
  return (result as unknown) as AlertActionParams;
}
