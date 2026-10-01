/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserRt } from '../user/v1';

/** A note on a task. Kept apart from case comments so task threads never reach the case activity. */
export const CaseTaskCommentAttributesRt = rt.strict({
  task_id: rt.string,
  case_id: rt.string,
  comment: rt.string,
  owner: rt.string,
  created_at: rt.string,
  created_by: UserRt,
});

export const CaseTaskCommentRt = rt.intersection([
  CaseTaskCommentAttributesRt,
  rt.strict({
    id: rt.string,
    version: rt.string,
  }),
]);

export type CaseTaskCommentAttributes = rt.TypeOf<typeof CaseTaskCommentAttributesRt>;
export type CaseTaskComment = rt.TypeOf<typeof CaseTaskCommentRt>;
