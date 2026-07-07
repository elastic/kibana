/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

const trackedAlertStateRt = t.type({
  alertId: t.string,
  alertUuid: t.string,
  started: t.string,
  // an array used to track changes in alert state, the order is based on the rule executions
  // true - alert has changed from active/recovered
  // false - alert is new or the status has remained either active or recovered
  flappingHistory: t.array(t.boolean),
  // flapping flag that indicates whether the alert is flapping
  flapping: t.boolean,
  // count of consecutive recovered alerts for flapping
  // will reset if the alert is active or if equal to the statusChangeThreshold stored in the rule settings
  pendingRecoveredCount: t.number,
  // count of consecutive active alerts will reset if the alert is recovered
  activeCount: t.number,
});

export type TrackedLifecycleAlertState = t.TypeOf<typeof trackedAlertStateRt>;

type RuleTypeState = Record<string, unknown>;

export const alertTypeStateRt = <State extends RuleTypeState>() =>
  t.record(t.string, t.unknown) as t.Type<State, State, unknown>;

export const wrappedStateRt = <State extends RuleTypeState>() =>
  t.type({
    wrapped: alertTypeStateRt<State>(),
    // tracks the active alerts
    trackedAlerts: t.record(t.string, trackedAlertStateRt),
    // tracks the recovered alerts
    trackedAlertsRecovered: t.record(t.string, trackedAlertStateRt),
  });

/**
 * This is redefined instead of derived from above `wrappedStateRt` because
 * there's no easy way to instantiate generic values such as the runtime type
 * factory function.
 */
export type WrappedLifecycleRuleState<State extends RuleTypeState> = RuleTypeState & {
  wrapped: State;
  trackedAlerts: Record<string, TrackedLifecycleAlertState>;
  trackedAlertsRecovered: Record<string, TrackedLifecycleAlertState>;
};
