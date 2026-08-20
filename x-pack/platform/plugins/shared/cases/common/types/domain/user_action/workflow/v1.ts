/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
  ATTACHMENT_WORKFLOW_ORIGIN_TYPE,
  CASE_WORKFLOW_ORIGIN_TYPE,
  COMMENT_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
} from './constants';
import { UserActionTypes } from '../action/v1';

export const WorkflowPayloadRt = rt.strict({
  id: rt.string,
  name: rt.string,
  executionId: rt.string,
});

export const WorkflowOriginRt = rt.exact(
  rt.intersection([
    rt.type({
      type: rt.union([
        rt.literal(CASE_WORKFLOW_ORIGIN_TYPE),
        rt.literal(OBSERVABLE_WORKFLOW_ORIGIN_TYPE),
        rt.literal(ALERT_WORKFLOW_ORIGIN_TYPE),
        rt.literal(ALERTS_WORKFLOW_ORIGIN_TYPE),
        rt.literal(COMMENT_WORKFLOW_ORIGIN_TYPE),
        rt.literal(ATTACHMENT_WORKFLOW_ORIGIN_TYPE),
      ]),
      id: rt.string,
    }),
    rt.partial({
      index: rt.string,
      typeKey: rt.string,
      value: rt.string,
    }),
  ])
);

export const WorkflowUserActionPayloadRt = rt.strict({
  workflow: WorkflowPayloadRt,
  origin: WorkflowOriginRt,
});

export const WorkflowUserActionRt = rt.strict({
  type: rt.literal(UserActionTypes.workflow),
  payload: WorkflowUserActionPayloadRt,
});

export type WorkflowPayload = rt.TypeOf<typeof WorkflowPayloadRt>;
export type WorkflowOrigin = rt.TypeOf<typeof WorkflowOriginRt>;
