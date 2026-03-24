/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserActionTypes } from '../action/v1';

export const ExtendedFieldsRt = rt.record(rt.string, rt.string);

export const ExtendedFieldsUserActionPayloadRt = rt.strict({
  extended_fields: ExtendedFieldsRt,
});

export const ExtendedFieldsUserActionRt = rt.strict({
  type: rt.literal(UserActionTypes.extended_fields),
  payload: ExtendedFieldsUserActionPayloadRt,
});
