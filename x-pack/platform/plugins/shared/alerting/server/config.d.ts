import type { TypeOf } from '@kbn/config-schema';
export declare const DEFAULT_MAX_ALERTS = 1000;
declare const rulesSchema: import("@kbn/config-schema").ObjectType<{
    minimumScheduleInterval: import("@kbn/config-schema").ObjectType<{
        value: import("@kbn/config-schema").Type<string>;
        enforce: import("@kbn/config-schema").Type<boolean>;
    }>;
    maxScheduledPerMinute: import("@kbn/config-schema").Type<number>;
    overwriteProducer: import("@kbn/config-schema").Type<"observability" | "stackAlerts" | "siem" | undefined>;
    run: import("@kbn/config-schema").ObjectType<{
        timeout: import("@kbn/config-schema").Type<string | undefined>;
        actions: import("@kbn/config-schema").ObjectType<{
            max: import("@kbn/config-schema").Type<number>;
            connectorTypeOverrides: import("@kbn/config-schema").Type<Readonly<{
                max?: number | undefined;
            } & {
                id: string;
            }>[] | undefined>;
        }>;
        alerts: import("@kbn/config-schema").ObjectType<{
            max: import("@kbn/config-schema").Type<number>;
        }>;
        ruleTypeOverrides: import("@kbn/config-schema").Type<Readonly<{
            timeout?: string | undefined;
        } & {
            id: string;
        }>[] | undefined>;
    }>;
    apiKeyType: import("@kbn/config-schema").Type<"es" | "uiam">;
}>;
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    healthCheck: import("@kbn/config-schema").ObjectType<{
        interval: import("@kbn/config-schema").Type<string>;
    }>;
    invalidateApiKeysTask: import("@kbn/config-schema").ObjectType<{
        interval: import("@kbn/config-schema").Type<string>;
        removalDelay: import("@kbn/config-schema").Type<string>;
    }>;
    maxEphemeralActionsPerAlert: import("@kbn/config-schema").Type<number | undefined>;
    enableFrameworkAlerts: import("@kbn/config-schema").Type<boolean>;
    cancelAlertsOnRuleTimeout: import("@kbn/config-schema").Type<boolean>;
    rules: import("@kbn/config-schema").ObjectType<{
        minimumScheduleInterval: import("@kbn/config-schema").ObjectType<{
            value: import("@kbn/config-schema").Type<string>;
            enforce: import("@kbn/config-schema").Type<boolean>;
        }>;
        maxScheduledPerMinute: import("@kbn/config-schema").Type<number>;
        overwriteProducer: import("@kbn/config-schema").Type<"observability" | "stackAlerts" | "siem" | undefined>;
        run: import("@kbn/config-schema").ObjectType<{
            timeout: import("@kbn/config-schema").Type<string | undefined>;
            actions: import("@kbn/config-schema").ObjectType<{
                max: import("@kbn/config-schema").Type<number>;
                connectorTypeOverrides: import("@kbn/config-schema").Type<Readonly<{
                    max?: number | undefined;
                } & {
                    id: string;
                }>[] | undefined>;
            }>;
            alerts: import("@kbn/config-schema").ObjectType<{
                max: import("@kbn/config-schema").Type<number>;
            }>;
            ruleTypeOverrides: import("@kbn/config-schema").Type<Readonly<{
                timeout?: string | undefined;
            } & {
                id: string;
            }>[] | undefined>;
        }>;
        apiKeyType: import("@kbn/config-schema").Type<"es" | "uiam">;
    }>;
    rulesSettings: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
        cacheInterval: import("@kbn/config-schema").Type<number>;
    }>;
    gapAutoFillScheduler: import("@kbn/config-schema").Type<Readonly<{
        timeout?: string | undefined;
    } & {
        enabled: boolean;
    }> | undefined>;
    disabledRuleTypes: import("@kbn/config-schema").Type<string[] | undefined>;
    enabledRuleTypes: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
export type AlertingConfig = TypeOf<typeof configSchema>;
export type RulesConfig = TypeOf<typeof rulesSchema>;
export type AlertingRulesConfig = Pick<AlertingConfig['rules'], 'minimumScheduleInterval' | 'maxScheduledPerMinute' | 'run'> & {
    isUsingSecurity: boolean;
};
export type ActionsConfig = RulesConfig['run']['actions'];
export type ActionTypeConfig = Omit<ActionsConfig, 'connectorTypeOverrides'>;
export {};
