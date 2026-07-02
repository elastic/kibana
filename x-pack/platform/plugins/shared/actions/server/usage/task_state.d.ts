import type { TypeOf } from '@kbn/config-schema';
/**
 * WARNING: Do not modify the existing versioned schema(s) below, instead define a new version (ex: 2, 3, 4).
 * This is required to support zero-downtime upgrades and rollbacks. See https://github.com/elastic/kibana/issues/155764.
 *
 * As you add a new schema version, don't forget to change latestTaskStateSchema variable to reference the latest schema.
 * For example, changing stateSchemaByVersion[1].schema to stateSchemaByVersion[2].schema.
 */
export declare const stateSchemaByVersion: {
    1: {
        up: (state: Record<string, unknown>) => {
            has_errors: {};
            error_messages: {} | undefined;
            runs: {};
            count_total: {};
            count_by_type: {};
            count_active_total: {};
            count_active_by_type: {};
            count_active_alert_history_connectors: {};
            count_active_email_connectors_by_service_type: {};
            count_actions_namespaces: {};
            count_actions_executions_per_day: {};
            count_actions_executions_by_type_per_day: {};
            count_actions_executions_failed_per_day: {};
            count_actions_executions_failed_by_type_per_day: {};
            avg_execution_time_per_day: {};
            avg_execution_time_by_type_per_day: {};
            count_connector_types_by_action_run_outcome_per_day: {};
        };
        schema: import("@kbn/config-schema").ObjectType<{
            has_errors: import("@kbn/config-schema").Type<boolean>;
            error_messages: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
            runs: import("@kbn/config-schema").Type<number>;
            count_total: import("@kbn/config-schema").Type<number>;
            count_by_type: import("@kbn/config-schema").Type<Record<string, number>>;
            count_gen_ai_provider_types: import("@kbn/config-schema").Type<Record<string, number>>;
            count_active_total: import("@kbn/config-schema").Type<number>;
            count_active_by_type: import("@kbn/config-schema").Type<Record<string, number>>;
            count_active_alert_history_connectors: import("@kbn/config-schema").Type<number>;
            count_active_email_connectors_by_service_type: import("@kbn/config-schema").Type<Record<string, number>>;
            count_actions_namespaces: import("@kbn/config-schema").Type<number>;
            count_actions_executions_per_day: import("@kbn/config-schema").Type<number>;
            count_actions_executions_by_type_per_day: import("@kbn/config-schema").Type<Record<string, number>>;
            count_actions_executions_failed_per_day: import("@kbn/config-schema").Type<number>;
            count_actions_executions_failed_by_type_per_day: import("@kbn/config-schema").Type<Record<string, number>>;
            avg_execution_time_per_day: import("@kbn/config-schema").Type<number>;
            avg_execution_time_by_type_per_day: import("@kbn/config-schema").Type<Record<string, number>>;
            count_connector_types_by_action_run_outcome_per_day: import("@kbn/config-schema").Type<Record<string, Record<string, number>>>;
        }>;
    };
    2: {
        up: (state: Record<string, unknown>) => Record<string, unknown>;
        schema: import("@kbn/config-schema").ObjectType<Omit<{
            has_errors: import("@kbn/config-schema").Type<boolean>;
            error_messages: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
            runs: import("@kbn/config-schema").Type<number>;
            count_total: import("@kbn/config-schema").Type<number>;
            count_by_type: import("@kbn/config-schema").Type<Record<string, number>>;
            count_gen_ai_provider_types: import("@kbn/config-schema").Type<Record<string, number>>;
            count_active_total: import("@kbn/config-schema").Type<number>;
            count_active_by_type: import("@kbn/config-schema").Type<Record<string, number>>;
            count_active_alert_history_connectors: import("@kbn/config-schema").Type<number>;
            count_active_email_connectors_by_service_type: import("@kbn/config-schema").Type<Record<string, number>>;
            count_actions_namespaces: import("@kbn/config-schema").Type<number>;
            count_actions_executions_per_day: import("@kbn/config-schema").Type<number>;
            count_actions_executions_by_type_per_day: import("@kbn/config-schema").Type<Record<string, number>>;
            count_actions_executions_failed_per_day: import("@kbn/config-schema").Type<number>;
            count_actions_executions_failed_by_type_per_day: import("@kbn/config-schema").Type<Record<string, number>>;
            avg_execution_time_per_day: import("@kbn/config-schema").Type<number>;
            avg_execution_time_by_type_per_day: import("@kbn/config-schema").Type<Record<string, number>>;
            count_connector_types_by_action_run_outcome_per_day: import("@kbn/config-schema").Type<Record<string, Record<string, number>>>;
        }, "error_messages"> & {
            error_messages: import("@kbn/config-schema").Type<string[] | Record<string, any> | undefined>;
        }>;
    };
};
declare const latestTaskStateSchema: import("@kbn/config-schema").ObjectType<Omit<{
    has_errors: import("@kbn/config-schema").Type<boolean>;
    error_messages: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    runs: import("@kbn/config-schema").Type<number>;
    count_total: import("@kbn/config-schema").Type<number>;
    count_by_type: import("@kbn/config-schema").Type<Record<string, number>>;
    count_gen_ai_provider_types: import("@kbn/config-schema").Type<Record<string, number>>;
    count_active_total: import("@kbn/config-schema").Type<number>;
    count_active_by_type: import("@kbn/config-schema").Type<Record<string, number>>;
    count_active_alert_history_connectors: import("@kbn/config-schema").Type<number>;
    count_active_email_connectors_by_service_type: import("@kbn/config-schema").Type<Record<string, number>>;
    count_actions_namespaces: import("@kbn/config-schema").Type<number>;
    count_actions_executions_per_day: import("@kbn/config-schema").Type<number>;
    count_actions_executions_by_type_per_day: import("@kbn/config-schema").Type<Record<string, number>>;
    count_actions_executions_failed_per_day: import("@kbn/config-schema").Type<number>;
    count_actions_executions_failed_by_type_per_day: import("@kbn/config-schema").Type<Record<string, number>>;
    avg_execution_time_per_day: import("@kbn/config-schema").Type<number>;
    avg_execution_time_by_type_per_day: import("@kbn/config-schema").Type<Record<string, number>>;
    count_connector_types_by_action_run_outcome_per_day: import("@kbn/config-schema").Type<Record<string, Record<string, number>>>;
}, "error_messages"> & {
    error_messages: import("@kbn/config-schema").Type<string[] | Record<string, any> | undefined>;
}>;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;
export declare const emptyState: LatestTaskStateSchema;
export {};
