/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface DispatchedAction<T, P> {
  type: T;
  payload: P;
}

export const createActionFactory = <ActionEnum>() => <T extends ActionEnum, P>(
  type: T,
  payload: P
): DispatchedAction<T, P> => ({
  type,
  payload,
});
