import { z } from '@kbn/zod/v4';
/**
 * An query condition to filter alerts
 */
export type Query = z.infer<typeof Query>;
export declare const Query: z.ZodObject<{
    query: z.ZodUnion<readonly [z.ZodString, z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>]>;
    language: z.ZodString;
}, z.core.$strip>;
/**
 * The filter array used to define the conditions for when alerts are selected as an attack discovery context. Defaults to an empty array.
 */
export type Filters = z.infer<typeof Filters>;
export declare const Filters: z.ZodArray<z.ZodUnknown>;
/**
 * An attack discovery schedule params
 */
export type AttackDiscoveryScheduleParams = z.infer<typeof AttackDiscoveryScheduleParams>;
export declare const AttackDiscoveryScheduleParams: z.ZodObject<{
    alertsIndexPattern: z.ZodString;
    apiConfig: z.ZodObject<{
        connectorId: z.ZodString;
        actionTypeId: z.ZodString;
        defaultSystemPromptId: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodEnum<{
            Other: "Other";
            "Azure OpenAI": "Azure OpenAI";
            OpenAI: "OpenAI";
        }>>;
        model: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
    }, z.core.$strip>;
    end: z.ZodOptional<z.ZodString>;
    query: z.ZodOptional<z.ZodObject<{
        query: z.ZodUnion<readonly [z.ZodString, z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>]>;
        language: z.ZodString;
    }, z.core.$strip>>;
    filters: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    combinedFilter: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    size: z.ZodNumber;
    start: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type IntervalSchedule = z.infer<typeof IntervalSchedule>;
export declare const IntervalSchedule: z.ZodObject<{
    interval: z.ZodString;
}, z.core.$strip>;
/**
 * Groups actions by use cases. Use `default` for alert notifications.
 */
export type AttackDiscoveryScheduleActionGroup = z.infer<typeof AttackDiscoveryScheduleActionGroup>;
export declare const AttackDiscoveryScheduleActionGroup: z.ZodString;
/**
 * The connector ID.
 */
export type AttackDiscoveryScheduleActionId = z.infer<typeof AttackDiscoveryScheduleActionId>;
export declare const AttackDiscoveryScheduleActionId: z.ZodString;
/**
 * Object containing the allowed connector fields, which varies according to the connector type.
 */
export type AttackDiscoveryScheduleActionParams = z.infer<typeof AttackDiscoveryScheduleActionParams>;
export declare const AttackDiscoveryScheduleActionParams: z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>;
export type AttackDiscoveryScheduleActionAlertsFilter = z.infer<typeof AttackDiscoveryScheduleActionAlertsFilter>;
export declare const AttackDiscoveryScheduleActionAlertsFilter: z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>;
/**
 * The condition for throttling the notification: `onActionGroupChange`, `onActiveAlert`,  or `onThrottleInterval`
 */
export type AttackDiscoveryScheduleActionNotifyWhen = z.infer<typeof AttackDiscoveryScheduleActionNotifyWhen>;
export declare const AttackDiscoveryScheduleActionNotifyWhen: z.ZodEnum<{
    onActionGroupChange: "onActionGroupChange";
    onActiveAlert: "onActiveAlert";
    onThrottleInterval: "onThrottleInterval";
}>;
export type AttackDiscoveryScheduleActionNotifyWhenEnum = typeof AttackDiscoveryScheduleActionNotifyWhen.enum;
export declare const AttackDiscoveryScheduleActionNotifyWhenEnum: {
    onActionGroupChange: "onActionGroupChange";
    onActiveAlert: "onActiveAlert";
    onThrottleInterval: "onThrottleInterval";
};
/**
 * Defines how often schedule actions are taken. Time interval in seconds, minutes, hours, or days.
 */
export type AttackDiscoveryScheduleActionThrottle = z.infer<typeof AttackDiscoveryScheduleActionThrottle>;
export declare const AttackDiscoveryScheduleActionThrottle: z.ZodString;
/**
 * The action frequency defines when the action runs (for example, only on schedule execution or at specific time intervals).
 */
export type AttackDiscoveryScheduleActionFrequency = z.infer<typeof AttackDiscoveryScheduleActionFrequency>;
export declare const AttackDiscoveryScheduleActionFrequency: z.ZodObject<{
    summary: z.ZodBoolean;
    notifyWhen: z.ZodEnum<{
        onActionGroupChange: "onActionGroupChange";
        onActiveAlert: "onActiveAlert";
        onThrottleInterval: "onThrottleInterval";
    }>;
    throttle: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type AttackDiscoveryScheduleGeneralAction = z.infer<typeof AttackDiscoveryScheduleGeneralAction>;
export declare const AttackDiscoveryScheduleGeneralAction: z.ZodObject<{
    actionTypeId: z.ZodString;
    group: z.ZodString;
    id: z.ZodString;
    params: z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>;
    uuid: z.ZodOptional<z.ZodString>;
    alertsFilter: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    frequency: z.ZodOptional<z.ZodObject<{
        summary: z.ZodBoolean;
        notifyWhen: z.ZodEnum<{
            onActionGroupChange: "onActionGroupChange";
            onActiveAlert: "onActiveAlert";
            onThrottleInterval: "onThrottleInterval";
        }>;
        throttle: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type AttackDiscoveryScheduleSystemAction = z.infer<typeof AttackDiscoveryScheduleSystemAction>;
export declare const AttackDiscoveryScheduleSystemAction: z.ZodObject<{
    actionTypeId: z.ZodString;
    id: z.ZodString;
    params: z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>;
    uuid: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type AttackDiscoveryScheduleAction = z.infer<typeof AttackDiscoveryScheduleAction>;
export declare const AttackDiscoveryScheduleAction: z.ZodUnion<readonly [z.ZodObject<{
    actionTypeId: z.ZodString;
    group: z.ZodString;
    id: z.ZodString;
    params: z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>;
    uuid: z.ZodOptional<z.ZodString>;
    alertsFilter: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    frequency: z.ZodOptional<z.ZodObject<{
        summary: z.ZodBoolean;
        notifyWhen: z.ZodEnum<{
            onActionGroupChange: "onActionGroupChange";
            onActiveAlert: "onActiveAlert";
            onThrottleInterval: "onThrottleInterval";
        }>;
        throttle: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    actionTypeId: z.ZodString;
    id: z.ZodString;
    params: z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>;
    uuid: z.ZodOptional<z.ZodString>;
}, z.core.$strip>]>;
/**
 * An attack discovery schedule execution status
 */
export type AttackDiscoveryScheduleExecutionStatus = z.infer<typeof AttackDiscoveryScheduleExecutionStatus>;
export declare const AttackDiscoveryScheduleExecutionStatus: z.ZodEnum<{
    error: "error";
    warning: "warning";
    unknown: "unknown";
    active: "active";
    ok: "ok";
}>;
export type AttackDiscoveryScheduleExecutionStatusEnum = typeof AttackDiscoveryScheduleExecutionStatus.enum;
export declare const AttackDiscoveryScheduleExecutionStatusEnum: {
    error: "error";
    warning: "warning";
    unknown: "unknown";
    active: "active";
    ok: "ok";
};
/**
 * An attack discovery schedule execution information
 */
export type AttackDiscoveryScheduleExecution = z.infer<typeof AttackDiscoveryScheduleExecution>;
export declare const AttackDiscoveryScheduleExecution: z.ZodObject<{
    date: z.ZodString;
    duration: z.ZodOptional<z.ZodNumber>;
    status: z.ZodEnum<{
        error: "error";
        warning: "warning";
        unknown: "unknown";
        active: "active";
        ok: "ok";
    }>;
    message: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * An attack discovery schedule
 */
export type AttackDiscoverySchedule = z.infer<typeof AttackDiscoverySchedule>;
export declare const AttackDiscoverySchedule: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    createdBy: z.ZodString;
    updatedBy: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    enabled: z.ZodBoolean;
    params: z.ZodObject<{
        alertsIndexPattern: z.ZodString;
        apiConfig: z.ZodObject<{
            connectorId: z.ZodString;
            actionTypeId: z.ZodString;
            defaultSystemPromptId: z.ZodOptional<z.ZodString>;
            provider: z.ZodOptional<z.ZodEnum<{
                Other: "Other";
                "Azure OpenAI": "Azure OpenAI";
                OpenAI: "OpenAI";
            }>>;
            model: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
        }, z.core.$strip>;
        end: z.ZodOptional<z.ZodString>;
        query: z.ZodOptional<z.ZodObject<{
            query: z.ZodUnion<readonly [z.ZodString, z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>]>;
            language: z.ZodString;
        }, z.core.$strip>>;
        filters: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
        combinedFilter: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        size: z.ZodNumber;
        start: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    schedule: z.ZodObject<{
        interval: z.ZodString;
    }, z.core.$strip>;
    actions: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        actionTypeId: z.ZodString;
        group: z.ZodString;
        id: z.ZodString;
        params: z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>;
        uuid: z.ZodOptional<z.ZodString>;
        alertsFilter: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        frequency: z.ZodOptional<z.ZodObject<{
            summary: z.ZodBoolean;
            notifyWhen: z.ZodEnum<{
                onActionGroupChange: "onActionGroupChange";
                onActiveAlert: "onActiveAlert";
                onThrottleInterval: "onThrottleInterval";
            }>;
            throttle: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        actionTypeId: z.ZodString;
        id: z.ZodString;
        params: z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>;
        uuid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>>;
    lastExecution: z.ZodOptional<z.ZodObject<{
        date: z.ZodString;
        duration: z.ZodOptional<z.ZodNumber>;
        status: z.ZodEnum<{
            error: "error";
            warning: "warning";
            unknown: "unknown";
            active: "active";
            ok: "ok";
        }>;
        message: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * An attack discovery schedule create properties
 */
export type AttackDiscoveryScheduleCreateProps = z.infer<typeof AttackDiscoveryScheduleCreateProps>;
export declare const AttackDiscoveryScheduleCreateProps: z.ZodObject<{
    name: z.ZodString;
    enabled: z.ZodOptional<z.ZodBoolean>;
    params: z.ZodObject<{
        alertsIndexPattern: z.ZodString;
        apiConfig: z.ZodObject<{
            connectorId: z.ZodString;
            actionTypeId: z.ZodString;
            defaultSystemPromptId: z.ZodOptional<z.ZodString>;
            provider: z.ZodOptional<z.ZodEnum<{
                Other: "Other";
                "Azure OpenAI": "Azure OpenAI";
                OpenAI: "OpenAI";
            }>>;
            model: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
        }, z.core.$strip>;
        end: z.ZodOptional<z.ZodString>;
        query: z.ZodOptional<z.ZodObject<{
            query: z.ZodUnion<readonly [z.ZodString, z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>]>;
            language: z.ZodString;
        }, z.core.$strip>>;
        filters: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
        combinedFilter: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        size: z.ZodNumber;
        start: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    schedule: z.ZodObject<{
        interval: z.ZodString;
    }, z.core.$strip>;
    actions: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        actionTypeId: z.ZodString;
        group: z.ZodString;
        id: z.ZodString;
        params: z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>;
        uuid: z.ZodOptional<z.ZodString>;
        alertsFilter: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        frequency: z.ZodOptional<z.ZodObject<{
            summary: z.ZodBoolean;
            notifyWhen: z.ZodEnum<{
                onActionGroupChange: "onActionGroupChange";
                onActiveAlert: "onActiveAlert";
                onThrottleInterval: "onThrottleInterval";
            }>;
            throttle: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        actionTypeId: z.ZodString;
        id: z.ZodString;
        params: z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>;
        uuid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>>>;
}, z.core.$strip>;
/**
 * An attack discovery schedule update properties
 */
export type AttackDiscoveryScheduleUpdateProps = z.infer<typeof AttackDiscoveryScheduleUpdateProps>;
export declare const AttackDiscoveryScheduleUpdateProps: z.ZodObject<{
    name: z.ZodString;
    params: z.ZodObject<{
        alertsIndexPattern: z.ZodString;
        apiConfig: z.ZodObject<{
            connectorId: z.ZodString;
            actionTypeId: z.ZodString;
            defaultSystemPromptId: z.ZodOptional<z.ZodString>;
            provider: z.ZodOptional<z.ZodEnum<{
                Other: "Other";
                "Azure OpenAI": "Azure OpenAI";
                OpenAI: "OpenAI";
            }>>;
            model: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
        }, z.core.$strip>;
        end: z.ZodOptional<z.ZodString>;
        query: z.ZodOptional<z.ZodObject<{
            query: z.ZodUnion<readonly [z.ZodString, z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>]>;
            language: z.ZodString;
        }, z.core.$strip>>;
        filters: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
        combinedFilter: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        size: z.ZodNumber;
        start: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    schedule: z.ZodObject<{
        interval: z.ZodString;
    }, z.core.$strip>;
    actions: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        actionTypeId: z.ZodString;
        group: z.ZodString;
        id: z.ZodString;
        params: z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>;
        uuid: z.ZodOptional<z.ZodString>;
        alertsFilter: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
        frequency: z.ZodOptional<z.ZodObject<{
            summary: z.ZodBoolean;
            notifyWhen: z.ZodEnum<{
                onActionGroupChange: "onActionGroupChange";
                onActiveAlert: "onActiveAlert";
                onThrottleInterval: "onThrottleInterval";
            }>;
            throttle: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, z.ZodObject<{
        actionTypeId: z.ZodString;
        id: z.ZodString;
        params: z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>;
        uuid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>>;
}, z.core.$strip>;
