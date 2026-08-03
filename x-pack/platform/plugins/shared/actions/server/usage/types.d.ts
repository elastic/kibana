import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
export interface ActionsUsage {
    has_errors: boolean;
    error_messages?: string[];
    alert_history_connector_enabled: boolean;
    count_total: number;
    count_by_type: Record<string, number>;
    count_gen_ai_provider_types: Record<string, number>;
    count_active_total: number;
    count_active_alert_history_connectors: number;
    count_active_by_type: Record<string, number>;
    count_active_email_connectors_by_service_type: Record<string, number>;
    count_actions_namespaces: number;
    count_actions_executions_per_day: number;
    count_actions_executions_by_type_per_day: Record<string, number>;
    count_actions_executions_failed_per_day: number;
    count_actions_executions_failed_by_type_per_day: Record<string, number>;
    count_connector_types_by_action_run_outcome_per_day: Record<string, Record<string, number>>;
    avg_execution_time_per_day: number;
    avg_execution_time_by_type_per_day: Record<string, number>;
}
export declare const byTypeSchema: MakeSchemaFrom<ActionsUsage>['count_by_type'];
export declare const byGenAiProviderTypeSchema: MakeSchemaFrom<ActionsUsage>['count_by_type'];
export declare const byServiceProviderTypeSchema: MakeSchemaFrom<ActionsUsage>['count_active_email_connectors_by_service_type'];
export interface ConnectorUsageReport {
    id: string;
    usage_timestamp: string;
    creation_timestamp: string;
    usage: {
        type: string;
        period_seconds: number;
        quantity: number | string | undefined;
    };
    source: {
        id: string | undefined;
        instance_group_id: string;
    };
}
