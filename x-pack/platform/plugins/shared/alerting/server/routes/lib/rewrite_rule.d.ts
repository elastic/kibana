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
    id: string;
    enabled: boolean;
    name: string;
    tags: string[];
    consumer: string;
    schedule: import("@kbn/alerting-types").IntervalSchedule;
    params: RuleTypeParams;
    mapped_params?: import("@kbn/alerting-types").MappedParams;
    createdByProfileUid?: string | null;
    updatedByProfileUid?: string | null;
    apiKeyOwnerProfileUid?: string | null;
    uiamApiKey?: string | null;
    throttle?: string | null;
    monitoring?: import("@kbn/alerting-types").RuleMonitoring;
    revision: number;
    running?: boolean | null;
    viewInAppRelativeUrl?: string;
    lastEnabledAt?: Date;
    flapping?: import("@kbn/alerting-types").Flapping | null;
    artifacts?: import("@kbn/alerting-types").Artifacts | null;
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
    is_snoozed_until?: Date | undefined;
    active_snoozes?: string[] | undefined;
    execution_status: {
        status: import("@kbn/alerting-types").RuleExecutionStatuses;
        error?: {
            reason: import("@kbn/alerting-types").RuleExecutionStatusErrorReasons;
            message: string;
        };
        warning?: {
            reason: import("@kbn/alerting-types").RuleExecutionStatusWarningReasons;
            message: string;
        };
        last_execution_date: Date;
        last_duration: number | undefined;
    };
    actions: unknown[];
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
    next_run?: Date | undefined;
    api_key_created_by_user?: boolean | null | undefined;
    alert_delay?: import("@kbn/alerting-types").AlertDelay | null | undefined;
};
