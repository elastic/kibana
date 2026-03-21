import type { IEvent, IEventLogger, InternalFields } from '@kbn/event-log-plugin/server';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { UntypedNormalizedRuleType } from '../../rule_type_registry';
import type { TaskRunnerTimings } from '../../task_runner/task_runner_timer';
import type { AlertInstanceState, RuleExecutionStatus } from '../../types';
import type { RuleRunMetrics } from '../rule_run_metrics_store';
import type { GapBase } from '../../application/gaps/types';
export interface RuleContext {
    id: string;
    type: UntypedNormalizedRuleType;
    consumer?: string;
    name?: string;
    revision?: number;
}
export interface ContextOpts {
    savedObjectId: string;
    savedObjectType: string;
    namespace?: string;
    spaceId: string;
    executionId: string;
    taskScheduledAt: Date;
}
export type Context = ContextOpts & {
    taskScheduleDelay: number;
};
export declare const executionType: {
    readonly STANDARD: "standard";
    readonly BACKFILL: "backfill";
};
export type ExecutionType = (typeof executionType)[keyof typeof executionType];
interface BackfillOpts {
    id: string;
    start?: string;
    interval?: string;
}
interface DoneOpts {
    timings?: TaskRunnerTimings;
    status?: RuleExecutionStatus;
    metrics?: RuleRunMetrics | null;
    backfill?: BackfillOpts;
}
interface LogTimeoutOpts {
    backfill?: BackfillOpts;
}
interface AlertOpts {
    action: string;
    id: string;
    uuid: string;
    message: string;
    group?: string;
    state?: AlertInstanceState;
    flapping: boolean;
    maintenanceWindowIds?: string[];
}
export interface ActionOpts {
    id: string;
    uuid?: string;
    typeId: string;
    alertId?: string;
    alertGroup?: string;
    alertSummary?: {
        new: number;
        ongoing: number;
        recovered: number;
    };
}
export interface SavedObjects {
    id: string;
    type: string;
    namespace?: string;
    relation?: string;
    typeId?: string;
}
export declare class AlertingEventLogger {
    private eventLogger;
    private isInitialized;
    private startTime?;
    private context?;
    private ruleData?;
    private relatedSavedObjects;
    private executionType;
    private event;
    constructor(eventLogger: IEventLogger);
    getEvent(): IEvent;
    initialize({ context, runDate, ruleData, type, }: {
        context: ContextOpts;
        runDate: Date;
        type?: ExecutionType;
        ruleData?: RuleContext;
    }): void;
    private initializeBackfill;
    private initializeStandard;
    getStartAndDuration(): {
        start?: Date;
        duration?: string | number;
    };
    addOrUpdateRuleData({ name, id, consumer, type, revision, }: {
        name?: string;
        id?: string;
        consumer?: string;
        revision?: number;
        type?: UntypedNormalizedRuleType;
    }): void;
    setExecutionSucceeded(message: string): void;
    setMaintenanceWindowIds(maintenanceWindowIds: string[]): void;
    setExecutionFailed(message: string, errorMessage: string): void;
    logTimeout({ backfill }?: LogTimeoutOpts): void;
    logAlert(alert: AlertOpts): void;
    logAction(action: ActionOpts): void;
    done({ status, metrics, timings, backfill }: DoneOpts): void;
    reportGap({ gap, }: {
        gap: {
            lte: string;
            gte: string;
        };
    }): void;
    updateGaps(docs: Array<{
        gap: GapBase;
        internalFields: InternalFields;
    }>): Promise<BulkResponse>;
    private logEventWithFixedUuid;
}
export declare function createAlertRecord(context: ContextOpts, ruleData: RuleContext, savedObjects: SavedObjects[], alert: AlertOpts): {
    error?: {
        id?: string | undefined;
        code?: string | undefined;
        type?: string | undefined;
        message?: string | undefined;
        stack_trace?: string | undefined;
    } | undefined;
    log?: {
        logger?: string | undefined;
        level?: string | undefined;
    } | undefined;
    '@timestamp'?: string | undefined;
    user?: {
        id?: string | undefined;
        name?: string | undefined;
    } | undefined;
    message?: string | undefined;
    rule?: {
        version?: string | undefined;
        id?: string | undefined;
        description?: string | undefined;
        name?: string | undefined;
        license?: string | undefined;
        uuid?: string | undefined;
        category?: string | undefined;
        reference?: string | undefined;
        author?: (string | undefined)[] | undefined;
        ruleset?: string | undefined;
    } | undefined;
    tags?: (string | undefined)[] | undefined;
    kibana?: {
        version?: string | undefined;
        alert?: {
            rule?: {
                gap?: {
                    status?: string | undefined;
                    range?: {
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined;
                    deleted?: boolean | undefined;
                    updated_at?: string | undefined;
                    filled_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    unfilled_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    in_progress_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    total_gap_duration_ms?: string | number | undefined;
                    filled_duration_ms?: string | number | undefined;
                    unfilled_duration_ms?: string | number | undefined;
                    in_progress_duration_ms?: string | number | undefined;
                    failed_auto_fill_attempts?: string | number | undefined;
                } | undefined;
                consumer?: string | undefined;
                execution?: {
                    status?: string | undefined;
                    uuid?: string | undefined;
                    metrics?: {
                        number_of_triggered_actions?: string | number | undefined;
                        number_of_generated_actions?: string | number | undefined;
                        alert_counts?: {
                            active?: string | number | undefined;
                            new?: string | number | undefined;
                            recovered?: string | number | undefined;
                        } | undefined;
                        number_of_delayed_alerts?: string | number | undefined;
                        number_of_searches?: string | number | undefined;
                        total_indexing_duration_ms?: string | number | undefined;
                        es_search_duration_ms?: string | number | undefined;
                        total_search_duration_ms?: string | number | undefined;
                        execution_gap_duration_s?: string | number | undefined;
                        gap_range?: {
                            gte?: string | undefined;
                            lte?: string | undefined;
                        } | undefined;
                        frozen_indices_queried_count?: string | number | undefined;
                        rule_type_run_duration_ms?: string | number | undefined;
                        process_alerts_duration_ms?: string | number | undefined;
                        trigger_actions_duration_ms?: string | number | undefined;
                        process_rule_duration_ms?: string | number | undefined;
                        claim_to_start_duration_ms?: string | number | undefined;
                        persist_alerts_duration_ms?: string | number | undefined;
                        prepare_rule_duration_ms?: string | number | undefined;
                        total_run_duration_ms?: string | number | undefined;
                        total_enrichment_duration_ms?: string | number | undefined;
                        update_alerts_duration_ms?: string | number | undefined;
                    } | undefined;
                    status_order?: string | number | undefined;
                    backfill?: {
                        id?: string | undefined;
                        start?: string | undefined;
                        interval?: string | undefined;
                    } | undefined;
                } | undefined;
                revision?: string | number | undefined;
                rule_type_id?: string | undefined;
            } | undefined;
            uuid?: string | undefined;
            deletion?: {
                num_deleted?: string | number | undefined;
            } | undefined;
            flapping?: boolean | undefined;
            maintenance_window_ids?: (string | undefined)[] | undefined;
        } | undefined;
        task?: {
            id?: string | undefined;
            schedule_delay?: string | number | undefined;
            scheduled?: string | undefined;
        } | undefined;
        action?: {
            id?: string | undefined;
            name?: string | undefined;
            execution?: {
                source?: string | undefined;
                uuid?: string | undefined;
                usage?: {
                    request_body_bytes?: string | number | undefined;
                } | undefined;
                gen_ai?: {
                    usage?: {
                        total_tokens?: string | number | undefined;
                        prompt_tokens?: string | number | undefined;
                        completion_tokens?: string | number | undefined;
                    } | undefined;
                } | undefined;
            } | undefined;
            type_id?: string | undefined;
        } | undefined;
        saved_objects?: ({
            id?: string | undefined;
            rel?: string | undefined;
            type?: string | undefined;
            namespace?: string | undefined;
            type_id?: string | undefined;
            space_agnostic?: boolean | undefined;
        } | undefined)[] | undefined;
        alerting?: {
            status?: string | undefined;
            summary?: {
                new?: {
                    count?: string | number | undefined;
                } | undefined;
                ongoing?: {
                    count?: string | number | undefined;
                } | undefined;
                recovered?: {
                    count?: string | number | undefined;
                } | undefined;
            } | undefined;
            outcome?: string | undefined;
            instance_id?: string | undefined;
            action_group_id?: string | undefined;
            action_subgroup?: string | undefined;
        } | undefined;
        server_uuid?: string | undefined;
        space_ids?: (string | undefined)[] | undefined;
        user_api_key?: {
            id?: string | undefined;
            name?: string | undefined;
        } | undefined;
        gap_auto_fill?: {
            execution?: {
                results?: ({
                    error?: string | undefined;
                    status?: string | undefined;
                    rule_id?: string | undefined;
                    processed_gaps?: string | number | undefined;
                } | undefined)[] | undefined;
                status?: string | undefined;
                end?: string | undefined;
                start?: string | undefined;
                duration_ms?: string | number | undefined;
                rule_ids?: (string | undefined)[] | undefined;
                task_params?: {
                    name?: string | undefined;
                    interval?: string | undefined;
                    num_retries?: string | number | undefined;
                    gap_fill_range?: string | undefined;
                    max_backfills?: string | number | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    event?: {
        id?: string | undefined;
        provider?: string | undefined;
        url?: string | undefined;
        code?: string | undefined;
        type?: (string | undefined)[] | undefined;
        severity?: string | number | undefined;
        dataset?: string | undefined;
        end?: string | undefined;
        start?: string | undefined;
        action?: string | undefined;
        kind?: string | undefined;
        hash?: string | undefined;
        created?: string | undefined;
        original?: string | undefined;
        timezone?: string | undefined;
        duration?: string | number | undefined;
        category?: (string | undefined)[] | undefined;
        reason?: string | undefined;
        outcome?: string | undefined;
        ingested?: string | undefined;
        module?: string | undefined;
        reference?: string | undefined;
        risk_score?: number | undefined;
        risk_score_norm?: number | undefined;
        sequence?: string | number | undefined;
    } | undefined;
    ecs?: {
        version?: string | undefined;
    } | undefined;
};
export declare function createActionExecuteRecord(context: ContextOpts, ruleData: RuleContext, savedObjects: SavedObjects[], action: ActionOpts): {
    error?: {
        id?: string | undefined;
        code?: string | undefined;
        type?: string | undefined;
        message?: string | undefined;
        stack_trace?: string | undefined;
    } | undefined;
    log?: {
        logger?: string | undefined;
        level?: string | undefined;
    } | undefined;
    '@timestamp'?: string | undefined;
    user?: {
        id?: string | undefined;
        name?: string | undefined;
    } | undefined;
    message?: string | undefined;
    rule?: {
        version?: string | undefined;
        id?: string | undefined;
        description?: string | undefined;
        name?: string | undefined;
        license?: string | undefined;
        uuid?: string | undefined;
        category?: string | undefined;
        reference?: string | undefined;
        author?: (string | undefined)[] | undefined;
        ruleset?: string | undefined;
    } | undefined;
    tags?: (string | undefined)[] | undefined;
    kibana?: {
        version?: string | undefined;
        alert?: {
            rule?: {
                gap?: {
                    status?: string | undefined;
                    range?: {
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined;
                    deleted?: boolean | undefined;
                    updated_at?: string | undefined;
                    filled_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    unfilled_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    in_progress_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    total_gap_duration_ms?: string | number | undefined;
                    filled_duration_ms?: string | number | undefined;
                    unfilled_duration_ms?: string | number | undefined;
                    in_progress_duration_ms?: string | number | undefined;
                    failed_auto_fill_attempts?: string | number | undefined;
                } | undefined;
                consumer?: string | undefined;
                execution?: {
                    status?: string | undefined;
                    uuid?: string | undefined;
                    metrics?: {
                        number_of_triggered_actions?: string | number | undefined;
                        number_of_generated_actions?: string | number | undefined;
                        alert_counts?: {
                            active?: string | number | undefined;
                            new?: string | number | undefined;
                            recovered?: string | number | undefined;
                        } | undefined;
                        number_of_delayed_alerts?: string | number | undefined;
                        number_of_searches?: string | number | undefined;
                        total_indexing_duration_ms?: string | number | undefined;
                        es_search_duration_ms?: string | number | undefined;
                        total_search_duration_ms?: string | number | undefined;
                        execution_gap_duration_s?: string | number | undefined;
                        gap_range?: {
                            gte?: string | undefined;
                            lte?: string | undefined;
                        } | undefined;
                        frozen_indices_queried_count?: string | number | undefined;
                        rule_type_run_duration_ms?: string | number | undefined;
                        process_alerts_duration_ms?: string | number | undefined;
                        trigger_actions_duration_ms?: string | number | undefined;
                        process_rule_duration_ms?: string | number | undefined;
                        claim_to_start_duration_ms?: string | number | undefined;
                        persist_alerts_duration_ms?: string | number | undefined;
                        prepare_rule_duration_ms?: string | number | undefined;
                        total_run_duration_ms?: string | number | undefined;
                        total_enrichment_duration_ms?: string | number | undefined;
                        update_alerts_duration_ms?: string | number | undefined;
                    } | undefined;
                    status_order?: string | number | undefined;
                    backfill?: {
                        id?: string | undefined;
                        start?: string | undefined;
                        interval?: string | undefined;
                    } | undefined;
                } | undefined;
                revision?: string | number | undefined;
                rule_type_id?: string | undefined;
            } | undefined;
            uuid?: string | undefined;
            deletion?: {
                num_deleted?: string | number | undefined;
            } | undefined;
            flapping?: boolean | undefined;
            maintenance_window_ids?: (string | undefined)[] | undefined;
        } | undefined;
        task?: {
            id?: string | undefined;
            schedule_delay?: string | number | undefined;
            scheduled?: string | undefined;
        } | undefined;
        action?: {
            id?: string | undefined;
            name?: string | undefined;
            execution?: {
                source?: string | undefined;
                uuid?: string | undefined;
                usage?: {
                    request_body_bytes?: string | number | undefined;
                } | undefined;
                gen_ai?: {
                    usage?: {
                        total_tokens?: string | number | undefined;
                        prompt_tokens?: string | number | undefined;
                        completion_tokens?: string | number | undefined;
                    } | undefined;
                } | undefined;
            } | undefined;
            type_id?: string | undefined;
        } | undefined;
        saved_objects?: ({
            id?: string | undefined;
            rel?: string | undefined;
            type?: string | undefined;
            namespace?: string | undefined;
            type_id?: string | undefined;
            space_agnostic?: boolean | undefined;
        } | undefined)[] | undefined;
        alerting?: {
            status?: string | undefined;
            summary?: {
                new?: {
                    count?: string | number | undefined;
                } | undefined;
                ongoing?: {
                    count?: string | number | undefined;
                } | undefined;
                recovered?: {
                    count?: string | number | undefined;
                } | undefined;
            } | undefined;
            outcome?: string | undefined;
            instance_id?: string | undefined;
            action_group_id?: string | undefined;
            action_subgroup?: string | undefined;
        } | undefined;
        server_uuid?: string | undefined;
        space_ids?: (string | undefined)[] | undefined;
        user_api_key?: {
            id?: string | undefined;
            name?: string | undefined;
        } | undefined;
        gap_auto_fill?: {
            execution?: {
                results?: ({
                    error?: string | undefined;
                    status?: string | undefined;
                    rule_id?: string | undefined;
                    processed_gaps?: string | number | undefined;
                } | undefined)[] | undefined;
                status?: string | undefined;
                end?: string | undefined;
                start?: string | undefined;
                duration_ms?: string | number | undefined;
                rule_ids?: (string | undefined)[] | undefined;
                task_params?: {
                    name?: string | undefined;
                    interval?: string | undefined;
                    num_retries?: string | number | undefined;
                    gap_fill_range?: string | undefined;
                    max_backfills?: string | number | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    event?: {
        id?: string | undefined;
        provider?: string | undefined;
        url?: string | undefined;
        code?: string | undefined;
        type?: (string | undefined)[] | undefined;
        severity?: string | number | undefined;
        dataset?: string | undefined;
        end?: string | undefined;
        start?: string | undefined;
        action?: string | undefined;
        kind?: string | undefined;
        hash?: string | undefined;
        created?: string | undefined;
        original?: string | undefined;
        timezone?: string | undefined;
        duration?: string | number | undefined;
        category?: (string | undefined)[] | undefined;
        reason?: string | undefined;
        outcome?: string | undefined;
        ingested?: string | undefined;
        module?: string | undefined;
        reference?: string | undefined;
        risk_score?: number | undefined;
        risk_score_norm?: number | undefined;
        sequence?: string | number | undefined;
    } | undefined;
    ecs?: {
        version?: string | undefined;
    } | undefined;
};
export declare function createExecuteTimeoutRecord(context: ContextOpts, savedObjects: SavedObjects[], type: ExecutionType, ruleData?: RuleContext): {
    error?: {
        id?: string | undefined;
        code?: string | undefined;
        type?: string | undefined;
        message?: string | undefined;
        stack_trace?: string | undefined;
    } | undefined;
    log?: {
        logger?: string | undefined;
        level?: string | undefined;
    } | undefined;
    '@timestamp'?: string | undefined;
    user?: {
        id?: string | undefined;
        name?: string | undefined;
    } | undefined;
    message?: string | undefined;
    rule?: {
        version?: string | undefined;
        id?: string | undefined;
        description?: string | undefined;
        name?: string | undefined;
        license?: string | undefined;
        uuid?: string | undefined;
        category?: string | undefined;
        reference?: string | undefined;
        author?: (string | undefined)[] | undefined;
        ruleset?: string | undefined;
    } | undefined;
    tags?: (string | undefined)[] | undefined;
    kibana?: {
        version?: string | undefined;
        alert?: {
            rule?: {
                gap?: {
                    status?: string | undefined;
                    range?: {
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined;
                    deleted?: boolean | undefined;
                    updated_at?: string | undefined;
                    filled_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    unfilled_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    in_progress_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    total_gap_duration_ms?: string | number | undefined;
                    filled_duration_ms?: string | number | undefined;
                    unfilled_duration_ms?: string | number | undefined;
                    in_progress_duration_ms?: string | number | undefined;
                    failed_auto_fill_attempts?: string | number | undefined;
                } | undefined;
                consumer?: string | undefined;
                execution?: {
                    status?: string | undefined;
                    uuid?: string | undefined;
                    metrics?: {
                        number_of_triggered_actions?: string | number | undefined;
                        number_of_generated_actions?: string | number | undefined;
                        alert_counts?: {
                            active?: string | number | undefined;
                            new?: string | number | undefined;
                            recovered?: string | number | undefined;
                        } | undefined;
                        number_of_delayed_alerts?: string | number | undefined;
                        number_of_searches?: string | number | undefined;
                        total_indexing_duration_ms?: string | number | undefined;
                        es_search_duration_ms?: string | number | undefined;
                        total_search_duration_ms?: string | number | undefined;
                        execution_gap_duration_s?: string | number | undefined;
                        gap_range?: {
                            gte?: string | undefined;
                            lte?: string | undefined;
                        } | undefined;
                        frozen_indices_queried_count?: string | number | undefined;
                        rule_type_run_duration_ms?: string | number | undefined;
                        process_alerts_duration_ms?: string | number | undefined;
                        trigger_actions_duration_ms?: string | number | undefined;
                        process_rule_duration_ms?: string | number | undefined;
                        claim_to_start_duration_ms?: string | number | undefined;
                        persist_alerts_duration_ms?: string | number | undefined;
                        prepare_rule_duration_ms?: string | number | undefined;
                        total_run_duration_ms?: string | number | undefined;
                        total_enrichment_duration_ms?: string | number | undefined;
                        update_alerts_duration_ms?: string | number | undefined;
                    } | undefined;
                    status_order?: string | number | undefined;
                    backfill?: {
                        id?: string | undefined;
                        start?: string | undefined;
                        interval?: string | undefined;
                    } | undefined;
                } | undefined;
                revision?: string | number | undefined;
                rule_type_id?: string | undefined;
            } | undefined;
            uuid?: string | undefined;
            deletion?: {
                num_deleted?: string | number | undefined;
            } | undefined;
            flapping?: boolean | undefined;
            maintenance_window_ids?: (string | undefined)[] | undefined;
        } | undefined;
        task?: {
            id?: string | undefined;
            schedule_delay?: string | number | undefined;
            scheduled?: string | undefined;
        } | undefined;
        action?: {
            id?: string | undefined;
            name?: string | undefined;
            execution?: {
                source?: string | undefined;
                uuid?: string | undefined;
                usage?: {
                    request_body_bytes?: string | number | undefined;
                } | undefined;
                gen_ai?: {
                    usage?: {
                        total_tokens?: string | number | undefined;
                        prompt_tokens?: string | number | undefined;
                        completion_tokens?: string | number | undefined;
                    } | undefined;
                } | undefined;
            } | undefined;
            type_id?: string | undefined;
        } | undefined;
        saved_objects?: ({
            id?: string | undefined;
            rel?: string | undefined;
            type?: string | undefined;
            namespace?: string | undefined;
            type_id?: string | undefined;
            space_agnostic?: boolean | undefined;
        } | undefined)[] | undefined;
        alerting?: {
            status?: string | undefined;
            summary?: {
                new?: {
                    count?: string | number | undefined;
                } | undefined;
                ongoing?: {
                    count?: string | number | undefined;
                } | undefined;
                recovered?: {
                    count?: string | number | undefined;
                } | undefined;
            } | undefined;
            outcome?: string | undefined;
            instance_id?: string | undefined;
            action_group_id?: string | undefined;
            action_subgroup?: string | undefined;
        } | undefined;
        server_uuid?: string | undefined;
        space_ids?: (string | undefined)[] | undefined;
        user_api_key?: {
            id?: string | undefined;
            name?: string | undefined;
        } | undefined;
        gap_auto_fill?: {
            execution?: {
                results?: ({
                    error?: string | undefined;
                    status?: string | undefined;
                    rule_id?: string | undefined;
                    processed_gaps?: string | number | undefined;
                } | undefined)[] | undefined;
                status?: string | undefined;
                end?: string | undefined;
                start?: string | undefined;
                duration_ms?: string | number | undefined;
                rule_ids?: (string | undefined)[] | undefined;
                task_params?: {
                    name?: string | undefined;
                    interval?: string | undefined;
                    num_retries?: string | number | undefined;
                    gap_fill_range?: string | undefined;
                    max_backfills?: string | number | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    event?: {
        id?: string | undefined;
        provider?: string | undefined;
        url?: string | undefined;
        code?: string | undefined;
        type?: (string | undefined)[] | undefined;
        severity?: string | number | undefined;
        dataset?: string | undefined;
        end?: string | undefined;
        start?: string | undefined;
        action?: string | undefined;
        kind?: string | undefined;
        hash?: string | undefined;
        created?: string | undefined;
        original?: string | undefined;
        timezone?: string | undefined;
        duration?: string | number | undefined;
        category?: (string | undefined)[] | undefined;
        reason?: string | undefined;
        outcome?: string | undefined;
        ingested?: string | undefined;
        module?: string | undefined;
        reference?: string | undefined;
        risk_score?: number | undefined;
        risk_score_norm?: number | undefined;
        sequence?: string | number | undefined;
    } | undefined;
    ecs?: {
        version?: string | undefined;
    } | undefined;
};
export declare function createGapRecord(context: ContextOpts, ruleData: RuleContext, savedObjects: SavedObjects[], gap: {
    status: string;
    range: {
        gte: string;
        lte: string;
    };
}): {
    error?: {
        id?: string | undefined;
        code?: string | undefined;
        type?: string | undefined;
        message?: string | undefined;
        stack_trace?: string | undefined;
    } | undefined;
    log?: {
        logger?: string | undefined;
        level?: string | undefined;
    } | undefined;
    '@timestamp'?: string | undefined;
    user?: {
        id?: string | undefined;
        name?: string | undefined;
    } | undefined;
    message?: string | undefined;
    rule?: {
        version?: string | undefined;
        id?: string | undefined;
        description?: string | undefined;
        name?: string | undefined;
        license?: string | undefined;
        uuid?: string | undefined;
        category?: string | undefined;
        reference?: string | undefined;
        author?: (string | undefined)[] | undefined;
        ruleset?: string | undefined;
    } | undefined;
    tags?: (string | undefined)[] | undefined;
    kibana?: {
        version?: string | undefined;
        alert?: {
            rule?: {
                gap?: {
                    status?: string | undefined;
                    range?: {
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined;
                    deleted?: boolean | undefined;
                    updated_at?: string | undefined;
                    filled_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    unfilled_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    in_progress_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    total_gap_duration_ms?: string | number | undefined;
                    filled_duration_ms?: string | number | undefined;
                    unfilled_duration_ms?: string | number | undefined;
                    in_progress_duration_ms?: string | number | undefined;
                    failed_auto_fill_attempts?: string | number | undefined;
                } | undefined;
                consumer?: string | undefined;
                execution?: {
                    status?: string | undefined;
                    uuid?: string | undefined;
                    metrics?: {
                        number_of_triggered_actions?: string | number | undefined;
                        number_of_generated_actions?: string | number | undefined;
                        alert_counts?: {
                            active?: string | number | undefined;
                            new?: string | number | undefined;
                            recovered?: string | number | undefined;
                        } | undefined;
                        number_of_delayed_alerts?: string | number | undefined;
                        number_of_searches?: string | number | undefined;
                        total_indexing_duration_ms?: string | number | undefined;
                        es_search_duration_ms?: string | number | undefined;
                        total_search_duration_ms?: string | number | undefined;
                        execution_gap_duration_s?: string | number | undefined;
                        gap_range?: {
                            gte?: string | undefined;
                            lte?: string | undefined;
                        } | undefined;
                        frozen_indices_queried_count?: string | number | undefined;
                        rule_type_run_duration_ms?: string | number | undefined;
                        process_alerts_duration_ms?: string | number | undefined;
                        trigger_actions_duration_ms?: string | number | undefined;
                        process_rule_duration_ms?: string | number | undefined;
                        claim_to_start_duration_ms?: string | number | undefined;
                        persist_alerts_duration_ms?: string | number | undefined;
                        prepare_rule_duration_ms?: string | number | undefined;
                        total_run_duration_ms?: string | number | undefined;
                        total_enrichment_duration_ms?: string | number | undefined;
                        update_alerts_duration_ms?: string | number | undefined;
                    } | undefined;
                    status_order?: string | number | undefined;
                    backfill?: {
                        id?: string | undefined;
                        start?: string | undefined;
                        interval?: string | undefined;
                    } | undefined;
                } | undefined;
                revision?: string | number | undefined;
                rule_type_id?: string | undefined;
            } | undefined;
            uuid?: string | undefined;
            deletion?: {
                num_deleted?: string | number | undefined;
            } | undefined;
            flapping?: boolean | undefined;
            maintenance_window_ids?: (string | undefined)[] | undefined;
        } | undefined;
        task?: {
            id?: string | undefined;
            schedule_delay?: string | number | undefined;
            scheduled?: string | undefined;
        } | undefined;
        action?: {
            id?: string | undefined;
            name?: string | undefined;
            execution?: {
                source?: string | undefined;
                uuid?: string | undefined;
                usage?: {
                    request_body_bytes?: string | number | undefined;
                } | undefined;
                gen_ai?: {
                    usage?: {
                        total_tokens?: string | number | undefined;
                        prompt_tokens?: string | number | undefined;
                        completion_tokens?: string | number | undefined;
                    } | undefined;
                } | undefined;
            } | undefined;
            type_id?: string | undefined;
        } | undefined;
        saved_objects?: ({
            id?: string | undefined;
            rel?: string | undefined;
            type?: string | undefined;
            namespace?: string | undefined;
            type_id?: string | undefined;
            space_agnostic?: boolean | undefined;
        } | undefined)[] | undefined;
        alerting?: {
            status?: string | undefined;
            summary?: {
                new?: {
                    count?: string | number | undefined;
                } | undefined;
                ongoing?: {
                    count?: string | number | undefined;
                } | undefined;
                recovered?: {
                    count?: string | number | undefined;
                } | undefined;
            } | undefined;
            outcome?: string | undefined;
            instance_id?: string | undefined;
            action_group_id?: string | undefined;
            action_subgroup?: string | undefined;
        } | undefined;
        server_uuid?: string | undefined;
        space_ids?: (string | undefined)[] | undefined;
        user_api_key?: {
            id?: string | undefined;
            name?: string | undefined;
        } | undefined;
        gap_auto_fill?: {
            execution?: {
                results?: ({
                    error?: string | undefined;
                    status?: string | undefined;
                    rule_id?: string | undefined;
                    processed_gaps?: string | number | undefined;
                } | undefined)[] | undefined;
                status?: string | undefined;
                end?: string | undefined;
                start?: string | undefined;
                duration_ms?: string | number | undefined;
                rule_ids?: (string | undefined)[] | undefined;
                task_params?: {
                    name?: string | undefined;
                    interval?: string | undefined;
                    num_retries?: string | number | undefined;
                    gap_fill_range?: string | undefined;
                    max_backfills?: string | number | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    event?: {
        id?: string | undefined;
        provider?: string | undefined;
        url?: string | undefined;
        code?: string | undefined;
        type?: (string | undefined)[] | undefined;
        severity?: string | number | undefined;
        dataset?: string | undefined;
        end?: string | undefined;
        start?: string | undefined;
        action?: string | undefined;
        kind?: string | undefined;
        hash?: string | undefined;
        created?: string | undefined;
        original?: string | undefined;
        timezone?: string | undefined;
        duration?: string | number | undefined;
        category?: (string | undefined)[] | undefined;
        reason?: string | undefined;
        outcome?: string | undefined;
        ingested?: string | undefined;
        module?: string | undefined;
        reference?: string | undefined;
        risk_score?: number | undefined;
        risk_score_norm?: number | undefined;
        sequence?: string | number | undefined;
    } | undefined;
    ecs?: {
        version?: string | undefined;
    } | undefined;
};
export declare function initializeExecuteRecord(context: Context, ruleData: RuleContext, so: SavedObjects[]): {
    error?: {
        id?: string | undefined;
        code?: string | undefined;
        type?: string | undefined;
        message?: string | undefined;
        stack_trace?: string | undefined;
    } | undefined;
    log?: {
        logger?: string | undefined;
        level?: string | undefined;
    } | undefined;
    '@timestamp'?: string | undefined;
    user?: {
        id?: string | undefined;
        name?: string | undefined;
    } | undefined;
    message?: string | undefined;
    rule?: {
        version?: string | undefined;
        id?: string | undefined;
        description?: string | undefined;
        name?: string | undefined;
        license?: string | undefined;
        uuid?: string | undefined;
        category?: string | undefined;
        reference?: string | undefined;
        author?: (string | undefined)[] | undefined;
        ruleset?: string | undefined;
    } | undefined;
    tags?: (string | undefined)[] | undefined;
    kibana?: {
        version?: string | undefined;
        alert?: {
            rule?: {
                gap?: {
                    status?: string | undefined;
                    range?: {
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined;
                    deleted?: boolean | undefined;
                    updated_at?: string | undefined;
                    filled_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    unfilled_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    in_progress_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    total_gap_duration_ms?: string | number | undefined;
                    filled_duration_ms?: string | number | undefined;
                    unfilled_duration_ms?: string | number | undefined;
                    in_progress_duration_ms?: string | number | undefined;
                    failed_auto_fill_attempts?: string | number | undefined;
                } | undefined;
                consumer?: string | undefined;
                execution?: {
                    status?: string | undefined;
                    uuid?: string | undefined;
                    metrics?: {
                        number_of_triggered_actions?: string | number | undefined;
                        number_of_generated_actions?: string | number | undefined;
                        alert_counts?: {
                            active?: string | number | undefined;
                            new?: string | number | undefined;
                            recovered?: string | number | undefined;
                        } | undefined;
                        number_of_delayed_alerts?: string | number | undefined;
                        number_of_searches?: string | number | undefined;
                        total_indexing_duration_ms?: string | number | undefined;
                        es_search_duration_ms?: string | number | undefined;
                        total_search_duration_ms?: string | number | undefined;
                        execution_gap_duration_s?: string | number | undefined;
                        gap_range?: {
                            gte?: string | undefined;
                            lte?: string | undefined;
                        } | undefined;
                        frozen_indices_queried_count?: string | number | undefined;
                        rule_type_run_duration_ms?: string | number | undefined;
                        process_alerts_duration_ms?: string | number | undefined;
                        trigger_actions_duration_ms?: string | number | undefined;
                        process_rule_duration_ms?: string | number | undefined;
                        claim_to_start_duration_ms?: string | number | undefined;
                        persist_alerts_duration_ms?: string | number | undefined;
                        prepare_rule_duration_ms?: string | number | undefined;
                        total_run_duration_ms?: string | number | undefined;
                        total_enrichment_duration_ms?: string | number | undefined;
                        update_alerts_duration_ms?: string | number | undefined;
                    } | undefined;
                    status_order?: string | number | undefined;
                    backfill?: {
                        id?: string | undefined;
                        start?: string | undefined;
                        interval?: string | undefined;
                    } | undefined;
                } | undefined;
                revision?: string | number | undefined;
                rule_type_id?: string | undefined;
            } | undefined;
            uuid?: string | undefined;
            deletion?: {
                num_deleted?: string | number | undefined;
            } | undefined;
            flapping?: boolean | undefined;
            maintenance_window_ids?: (string | undefined)[] | undefined;
        } | undefined;
        task?: {
            id?: string | undefined;
            schedule_delay?: string | number | undefined;
            scheduled?: string | undefined;
        } | undefined;
        action?: {
            id?: string | undefined;
            name?: string | undefined;
            execution?: {
                source?: string | undefined;
                uuid?: string | undefined;
                usage?: {
                    request_body_bytes?: string | number | undefined;
                } | undefined;
                gen_ai?: {
                    usage?: {
                        total_tokens?: string | number | undefined;
                        prompt_tokens?: string | number | undefined;
                        completion_tokens?: string | number | undefined;
                    } | undefined;
                } | undefined;
            } | undefined;
            type_id?: string | undefined;
        } | undefined;
        saved_objects?: ({
            id?: string | undefined;
            rel?: string | undefined;
            type?: string | undefined;
            namespace?: string | undefined;
            type_id?: string | undefined;
            space_agnostic?: boolean | undefined;
        } | undefined)[] | undefined;
        alerting?: {
            status?: string | undefined;
            summary?: {
                new?: {
                    count?: string | number | undefined;
                } | undefined;
                ongoing?: {
                    count?: string | number | undefined;
                } | undefined;
                recovered?: {
                    count?: string | number | undefined;
                } | undefined;
            } | undefined;
            outcome?: string | undefined;
            instance_id?: string | undefined;
            action_group_id?: string | undefined;
            action_subgroup?: string | undefined;
        } | undefined;
        server_uuid?: string | undefined;
        space_ids?: (string | undefined)[] | undefined;
        user_api_key?: {
            id?: string | undefined;
            name?: string | undefined;
        } | undefined;
        gap_auto_fill?: {
            execution?: {
                results?: ({
                    error?: string | undefined;
                    status?: string | undefined;
                    rule_id?: string | undefined;
                    processed_gaps?: string | number | undefined;
                } | undefined)[] | undefined;
                status?: string | undefined;
                end?: string | undefined;
                start?: string | undefined;
                duration_ms?: string | number | undefined;
                rule_ids?: (string | undefined)[] | undefined;
                task_params?: {
                    name?: string | undefined;
                    interval?: string | undefined;
                    num_retries?: string | number | undefined;
                    gap_fill_range?: string | undefined;
                    max_backfills?: string | number | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    event?: {
        id?: string | undefined;
        provider?: string | undefined;
        url?: string | undefined;
        code?: string | undefined;
        type?: (string | undefined)[] | undefined;
        severity?: string | number | undefined;
        dataset?: string | undefined;
        end?: string | undefined;
        start?: string | undefined;
        action?: string | undefined;
        kind?: string | undefined;
        hash?: string | undefined;
        created?: string | undefined;
        original?: string | undefined;
        timezone?: string | undefined;
        duration?: string | number | undefined;
        category?: (string | undefined)[] | undefined;
        reason?: string | undefined;
        outcome?: string | undefined;
        ingested?: string | undefined;
        module?: string | undefined;
        reference?: string | undefined;
        risk_score?: number | undefined;
        risk_score_norm?: number | undefined;
        sequence?: string | number | undefined;
    } | undefined;
    ecs?: {
        version?: string | undefined;
    } | undefined;
};
export declare function initializeExecuteBackfillRecord(context: Context, so: SavedObjects[]): {
    error?: {
        id?: string | undefined;
        code?: string | undefined;
        type?: string | undefined;
        message?: string | undefined;
        stack_trace?: string | undefined;
    } | undefined;
    log?: {
        logger?: string | undefined;
        level?: string | undefined;
    } | undefined;
    '@timestamp'?: string | undefined;
    user?: {
        id?: string | undefined;
        name?: string | undefined;
    } | undefined;
    message?: string | undefined;
    rule?: {
        version?: string | undefined;
        id?: string | undefined;
        description?: string | undefined;
        name?: string | undefined;
        license?: string | undefined;
        uuid?: string | undefined;
        category?: string | undefined;
        reference?: string | undefined;
        author?: (string | undefined)[] | undefined;
        ruleset?: string | undefined;
    } | undefined;
    tags?: (string | undefined)[] | undefined;
    kibana?: {
        version?: string | undefined;
        alert?: {
            rule?: {
                gap?: {
                    status?: string | undefined;
                    range?: {
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined;
                    deleted?: boolean | undefined;
                    updated_at?: string | undefined;
                    filled_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    unfilled_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    in_progress_intervals?: ({
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } | undefined)[] | undefined;
                    total_gap_duration_ms?: string | number | undefined;
                    filled_duration_ms?: string | number | undefined;
                    unfilled_duration_ms?: string | number | undefined;
                    in_progress_duration_ms?: string | number | undefined;
                    failed_auto_fill_attempts?: string | number | undefined;
                } | undefined;
                consumer?: string | undefined;
                execution?: {
                    status?: string | undefined;
                    uuid?: string | undefined;
                    metrics?: {
                        number_of_triggered_actions?: string | number | undefined;
                        number_of_generated_actions?: string | number | undefined;
                        alert_counts?: {
                            active?: string | number | undefined;
                            new?: string | number | undefined;
                            recovered?: string | number | undefined;
                        } | undefined;
                        number_of_delayed_alerts?: string | number | undefined;
                        number_of_searches?: string | number | undefined;
                        total_indexing_duration_ms?: string | number | undefined;
                        es_search_duration_ms?: string | number | undefined;
                        total_search_duration_ms?: string | number | undefined;
                        execution_gap_duration_s?: string | number | undefined;
                        gap_range?: {
                            gte?: string | undefined;
                            lte?: string | undefined;
                        } | undefined;
                        frozen_indices_queried_count?: string | number | undefined;
                        rule_type_run_duration_ms?: string | number | undefined;
                        process_alerts_duration_ms?: string | number | undefined;
                        trigger_actions_duration_ms?: string | number | undefined;
                        process_rule_duration_ms?: string | number | undefined;
                        claim_to_start_duration_ms?: string | number | undefined;
                        persist_alerts_duration_ms?: string | number | undefined;
                        prepare_rule_duration_ms?: string | number | undefined;
                        total_run_duration_ms?: string | number | undefined;
                        total_enrichment_duration_ms?: string | number | undefined;
                        update_alerts_duration_ms?: string | number | undefined;
                    } | undefined;
                    status_order?: string | number | undefined;
                    backfill?: {
                        id?: string | undefined;
                        start?: string | undefined;
                        interval?: string | undefined;
                    } | undefined;
                } | undefined;
                revision?: string | number | undefined;
                rule_type_id?: string | undefined;
            } | undefined;
            uuid?: string | undefined;
            deletion?: {
                num_deleted?: string | number | undefined;
            } | undefined;
            flapping?: boolean | undefined;
            maintenance_window_ids?: (string | undefined)[] | undefined;
        } | undefined;
        task?: {
            id?: string | undefined;
            schedule_delay?: string | number | undefined;
            scheduled?: string | undefined;
        } | undefined;
        action?: {
            id?: string | undefined;
            name?: string | undefined;
            execution?: {
                source?: string | undefined;
                uuid?: string | undefined;
                usage?: {
                    request_body_bytes?: string | number | undefined;
                } | undefined;
                gen_ai?: {
                    usage?: {
                        total_tokens?: string | number | undefined;
                        prompt_tokens?: string | number | undefined;
                        completion_tokens?: string | number | undefined;
                    } | undefined;
                } | undefined;
            } | undefined;
            type_id?: string | undefined;
        } | undefined;
        saved_objects?: ({
            id?: string | undefined;
            rel?: string | undefined;
            type?: string | undefined;
            namespace?: string | undefined;
            type_id?: string | undefined;
            space_agnostic?: boolean | undefined;
        } | undefined)[] | undefined;
        alerting?: {
            status?: string | undefined;
            summary?: {
                new?: {
                    count?: string | number | undefined;
                } | undefined;
                ongoing?: {
                    count?: string | number | undefined;
                } | undefined;
                recovered?: {
                    count?: string | number | undefined;
                } | undefined;
            } | undefined;
            outcome?: string | undefined;
            instance_id?: string | undefined;
            action_group_id?: string | undefined;
            action_subgroup?: string | undefined;
        } | undefined;
        server_uuid?: string | undefined;
        space_ids?: (string | undefined)[] | undefined;
        user_api_key?: {
            id?: string | undefined;
            name?: string | undefined;
        } | undefined;
        gap_auto_fill?: {
            execution?: {
                results?: ({
                    error?: string | undefined;
                    status?: string | undefined;
                    rule_id?: string | undefined;
                    processed_gaps?: string | number | undefined;
                } | undefined)[] | undefined;
                status?: string | undefined;
                end?: string | undefined;
                start?: string | undefined;
                duration_ms?: string | number | undefined;
                rule_ids?: (string | undefined)[] | undefined;
                task_params?: {
                    name?: string | undefined;
                    interval?: string | undefined;
                    num_retries?: string | number | undefined;
                    gap_fill_range?: string | undefined;
                    max_backfills?: string | number | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    event?: {
        id?: string | undefined;
        provider?: string | undefined;
        url?: string | undefined;
        code?: string | undefined;
        type?: (string | undefined)[] | undefined;
        severity?: string | number | undefined;
        dataset?: string | undefined;
        end?: string | undefined;
        start?: string | undefined;
        action?: string | undefined;
        kind?: string | undefined;
        hash?: string | undefined;
        created?: string | undefined;
        original?: string | undefined;
        timezone?: string | undefined;
        duration?: string | number | undefined;
        category?: (string | undefined)[] | undefined;
        reason?: string | undefined;
        outcome?: string | undefined;
        ingested?: string | undefined;
        module?: string | undefined;
        reference?: string | undefined;
        risk_score?: number | undefined;
        risk_score_norm?: number | undefined;
        sequence?: string | number | undefined;
    } | undefined;
    ecs?: {
        version?: string | undefined;
    } | undefined;
};
interface UpdateEventOpts {
    message?: string;
    outcome?: string;
    alertingOutcome?: string;
    error?: string;
    status?: string;
    reason?: string;
    metrics?: RuleRunMetrics;
    timings?: TaskRunnerTimings;
    backfill?: BackfillOpts;
    maintenanceWindowIds?: string[];
}
interface UpdateRuleOpts {
    ruleName?: string;
    ruleId?: string;
    consumer?: string;
    ruleType?: UntypedNormalizedRuleType;
    revision?: number;
    savedObjects?: SavedObjects[];
}
export declare function updateEventWithRuleData(event: IEvent, opts: UpdateRuleOpts): void;
export declare function updateEvent(event: IEvent, opts: UpdateEventOpts): void;
export {};
