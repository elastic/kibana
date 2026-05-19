import type * as t from 'io-ts';
declare const trackedAlertStateRt: t.TypeC<{
    alertId: t.StringC;
    alertUuid: t.StringC;
    started: t.StringC;
    flappingHistory: t.ArrayC<t.BooleanC>;
    flapping: t.BooleanC;
    pendingRecoveredCount: t.NumberC;
    activeCount: t.NumberC;
}>;
export type TrackedLifecycleAlertState = t.TypeOf<typeof trackedAlertStateRt>;
type RuleTypeState = Record<string, unknown>;
export declare const alertTypeStateRt: <State extends RuleTypeState>() => t.Type<State, State, unknown>;
export declare const wrappedStateRt: <State extends RuleTypeState>() => t.TypeC<{
    wrapped: t.Type<State, State, unknown>;
    trackedAlerts: t.RecordC<t.StringC, t.TypeC<{
        alertId: t.StringC;
        alertUuid: t.StringC;
        started: t.StringC;
        flappingHistory: t.ArrayC<t.BooleanC>;
        flapping: t.BooleanC;
        pendingRecoveredCount: t.NumberC;
        activeCount: t.NumberC;
    }>>;
    trackedAlertsRecovered: t.RecordC<t.StringC, t.TypeC<{
        alertId: t.StringC;
        alertUuid: t.StringC;
        started: t.StringC;
        flappingHistory: t.ArrayC<t.BooleanC>;
        flapping: t.BooleanC;
        pendingRecoveredCount: t.NumberC;
        activeCount: t.NumberC;
    }>>;
}>;
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
export {};
