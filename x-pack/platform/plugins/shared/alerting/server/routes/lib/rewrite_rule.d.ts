import type { RuleTypeParams, SanitizedRule, RuleLastRun } from '../../types';
export declare const rewriteRuleLastRun: (lastRun: RuleLastRun) => {
    outcome: import("@kbn/alerting-types").RuleLastRunOutcomes;
    warning?: import("@kbn/alerting-types").RuleExecutionStatusErrorReasons | import("@kbn/alerting-types").RuleExecutionStatusWarningReasons | null;
    alerts_count: {
        active?: number | null;
        new?: number | null;
        recovered?: number | null;
        ignored?: number | null;
    };
    outcome_msg: string[] | null | undefined;
    outcome_order: number | undefined;
};
export declare const rewriteRule: ({ alertTypeId, createdBy, updatedBy, createdAt, updatedAt, apiKeyOwner, apiKeyCreatedByUser, notifyWhen, muteAll, mutedInstanceIds, executionStatus, actions, systemActions, scheduledTaskId, snoozeSchedule, isSnoozedUntil, activeSnoozes, lastRun, nextRun, alertDelay, ...rest }: SanitizedRule<RuleTypeParams> & {
    activeSnoozes?: string[];
}) => {
    alert_delay?: import("@kbn/alerting-types").AlertDelay | null | undefined;
    api_key_created_by_user?: boolean | null | undefined;
    next_run?: Date | undefined;
    last_run?: {
        outcome: import("@kbn/alerting-types").RuleLastRunOutcomes;
        warning?: import("@kbn/alerting-types").RuleExecutionStatusErrorReasons | import("@kbn/alerting-types").RuleExecutionStatusWarningReasons | null;
        alerts_count: {
            active?: number | null;
            new?: number | null;
            recovered?: number | null;
            ignored?: number | null;
        };
        outcome_msg: string[] | null | undefined;
        outcome_order: number | undefined;
    } | undefined;
    execution_status: {
        last_execution_date: Date;
        last_duration: number | undefined;
        error?: {
            reason: import("@kbn/alerting-types").RuleExecutionStatusErrorReasons;
            message: string;
        } | undefined;
        warning?: {
            reason: import("@kbn/alerting-types").RuleExecutionStatusWarningReasons;
            message: string;
        } | undefined;
        status: import("@kbn/alerting-types").RuleExecutionStatuses;
    };
    actions: unknown[];
    active_snoozes?: string[] | undefined;
    is_snoozed_until?: Date | undefined;
    rule_type_id: string;
    created_by: string | null;
    updated_by: string | null;
    created_at: Date;
    updated_at: Date;
    api_key_owner: string | null;
    notify_when: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined;
    mute_all: boolean;
    muted_alert_ids: string[];
    scheduled_task_id: string | null | undefined;
    snooze_schedule: import("@kbn/alerting-types").RuleSnooze | undefined;
    id: string;
    params: RuleTypeParams;
    enabled: boolean;
    name: string;
    running?: boolean | null | undefined;
    tags: string[];
    revision: number;
    artifacts?: (import("@kbn/alerting-types").Artifacts | null) | undefined;
    monitoring?: import("@kbn/alerting-types").RuleMonitoring | undefined;
    consumer: string;
    flapping?: (import("@kbn/alerting-types").Flapping | null) | undefined;
    throttle?: string | null | undefined;
    schedule: import("@kbn/alerting-types").IntervalSchedule;
    mapped_params?: import("@kbn/alerting-types").MappedParams | undefined;
    uiamApiKey?: string | null | undefined;
    viewInAppRelativeUrl?: string | undefined;
    lastEnabledAt?: Date | undefined;
};
