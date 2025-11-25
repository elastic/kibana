/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserActionTypes } from '../action/v1';

const ObservablesActionTypeRt = rt.union([
  rt.literal('add'),
  rt.literal('delete'),
  rt.literal('update'),
]);

export const ObservablePayloadRt = rt.strict({
  count: rt.number,
  actionType: ObservablesActionTypeRt,
});

export const ObservablesUserActionPayloadRt = rt.strict({ observables: ObservablePayloadRt });

export const ObservablesUserActionRt = rt.strict({
  type: rt.literal(UserActionTypes.observables),
  payload: ObservablesUserActionPayloadRt,
});

export type ObservablesActionType = rt.TypeOf<typeof ObservablesActionTypeRt>;
