/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserActionTypes } from '../action/v1';
import {
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
} from './constants';

/** Identifies the workflow plus the specific execution to link to. */
export const WorkflowPayloadRt = rt.strict({
  id: rt.string,
  name: rt.string,
  executionId: rt.string,
});

/**
 * The activity origin: what the user was looking at when they triggered the workflow run.
 * The optional fields carry enrichment needed for display (observable type/value, alert index).
 */
export const WorkflowOriginRt = rt.exact(
  rt.intersection([
    rt.type({
      type: rt.union([
        rt.literal(CASE_WORKFLOW_ORIGIN_TYPE),
        rt.literal(OBSERVABLE_WORKFLOW_ORIGIN_TYPE),
        rt.literal(ALERT_WORKFLOW_ORIGIN_TYPE),
        rt.literal(ALERTS_WORKFLOW_ORIGIN_TYPE),
      ]),
      /** The primary identifier: caseId, observableId, or alertId. */
      id: rt.string,
    }),
    rt.partial({
      /** Alert origin: the ES index the alert lives in, used to build the deep link. */
      index: rt.string,
      /** Observable origin: the observable type key (e.g. 'ip', 'url'). */
      typeKey: rt.string,
      /** Observable origin: the observable value for display. */
      value: rt.string,
    }),
  ])
);

export const WorkflowUserActionPayloadRt = rt.exact(
  rt.intersection([
    rt.type({ workflow: WorkflowPayloadRt }),
    rt.partial({ origin: WorkflowOriginRt }),
  ])
);

export const WorkflowUserActionRt = rt.strict({
  type: rt.literal(UserActionTypes.workflow),
  payload: WorkflowUserActionPayloadRt,
});

export type WorkflowPayload = rt.TypeOf<typeof WorkflowPayloadRt>;
export type WorkflowOrigin = rt.TypeOf<typeof WorkflowOriginRt>;
export type WorkflowUserActionPayload = rt.TypeOf<typeof WorkflowUserActionPayloadRt>;
