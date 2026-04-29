/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserActionTypes } from '../action/v1';

export const TagsUserActionPayloadRt = rt.strict({ tags: rt.array(rt.string) });

export const TagsUserActionRt = rt.strict({
  type: rt.literal(UserActionTypes.tags),
  payload: TagsUserActionPayloadRt,
});
