import type { TypeOf } from '@kbn/config-schema';
type DeepWriteable<T> = {
    -readonly [P in keyof T]: DeepWriteable<T[P]>;
};
type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends Array<infer U> ? Array<DeepPartial<U>> : DeepPartial<T[P]>;
};
export declare const ECS_VERSION = "1.8.0";
export type IValidatedEvent = TypeOf<typeof EventSchema>;
export type IEvent = DeepPartial<DeepWriteable<IValidatedEvent>>;
export declare const EventSchema: import("@kbn/config-schema").Type<Readonly<{
    error?: Readonly<{
        id?: string | undefined;
        code?: string | undefined;
        type?: string | undefined;
        message?: string | undefined;
        stack_trace?: string | undefined;
    } & {}> | undefined;
    log?: Readonly<{
        logger?: string | undefined;
        level?: string | undefined;
    } & {}> | undefined;
    '@timestamp'?: string | undefined;
    user?: Readonly<{
        id?: string | undefined;
        name?: string | undefined;
    } & {}> | undefined;
    message?: string | undefined;
    rule?: Readonly<{
        version?: string | undefined;
        id?: string | undefined;
        description?: string | undefined;
        name?: string | undefined;
        license?: string | undefined;
        uuid?: string | undefined;
        category?: string | undefined;
        reference?: string | undefined;
        author?: string[] | undefined;
        ruleset?: string | undefined;
    } & {}> | undefined;
    tags?: string[] | undefined;
    kibana?: Readonly<{
        version?: string | undefined;
        alert?: Readonly<{
            rule?: Readonly<{
                gap?: Readonly<{
                    status?: string | undefined;
                    range?: Readonly<{
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } & {}> | undefined;
                    deleted?: boolean | undefined;
                    updated_at?: string | undefined;
                    filled_intervals?: Readonly<{
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } & {}>[] | undefined;
                    unfilled_intervals?: Readonly<{
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } & {}>[] | undefined;
                    in_progress_intervals?: Readonly<{
                        gte?: string | undefined;
                        lte?: string | undefined;
                    } & {}>[] | undefined;
                    total_gap_duration_ms?: string | number | undefined;
                    filled_duration_ms?: string | number | undefined;
                    unfilled_duration_ms?: string | number | undefined;
                    in_progress_duration_ms?: string | number | undefined;
                    failed_auto_fill_attempts?: string | number | undefined;
                } & {}> | undefined;
                consumer?: string | undefined;
                execution?: Readonly<{
                    status?: string | undefined;
                    uuid?: string | undefined;
                    metrics?: Readonly<{
                        number_of_triggered_actions?: string | number | undefined;
                        number_of_generated_actions?: string | number | undefined;
                        alert_counts?: Readonly<{
                            active?: string | number | undefined;
                            new?: string | number | undefined;
                            recovered?: string | number | undefined;
                        } & {}> | undefined;
                        number_of_delayed_alerts?: string | number | undefined;
                        number_of_searches?: string | number | undefined;
                        total_indexing_duration_ms?: string | number | undefined;
                        es_search_duration_ms?: string | number | undefined;
                        total_search_duration_ms?: string | number | undefined;
                        execution_gap_duration_s?: string | number | undefined;
                        gap_range?: Readonly<{
                            gte?: string | undefined;
                            lte?: string | undefined;
                        } & {}> | undefined;
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
                    } & {}> | undefined;
                    status_order?: string | number | undefined;
                    backfill?: Readonly<{
                        id?: string | undefined;
                        start?: string | undefined;
                        interval?: string | undefined;
                    } & {}> | undefined;
                } & {}> | undefined;
                revision?: string | number | undefined;
                rule_type_id?: string | undefined;
            } & {}> | undefined;
            uuid?: string | undefined;
            deletion?: Readonly<{
                num_deleted?: string | number | undefined;
            } & {}> | undefined;
            flapping?: boolean | undefined;
            maintenance_window_ids?: string[] | undefined;
        } & {}> | undefined;
        task?: Readonly<{
            id?: string | undefined;
            schedule_delay?: string | number | undefined;
            scheduled?: string | undefined;
        } & {}> | undefined;
        action?: Readonly<{
            id?: string | undefined;
            name?: string | undefined;
            execution?: Readonly<{
                source?: string | undefined;
                uuid?: string | undefined;
                usage?: Readonly<{
                    request_body_bytes?: string | number | undefined;
                } & {}> | undefined;
                gen_ai?: Readonly<{
                    usage?: Readonly<{
                        total_tokens?: string | number | undefined;
                        prompt_tokens?: string | number | undefined;
                        completion_tokens?: string | number | undefined;
                    } & {}> | undefined;
                } & {}> | undefined;
            } & {}> | undefined;
            type_id?: string | undefined;
        } & {}> | undefined;
        saved_objects?: Readonly<{
            id?: string | undefined;
            rel?: string | undefined;
            type?: string | undefined;
            namespace?: string | undefined;
            type_id?: string | undefined;
            space_agnostic?: boolean | undefined;
        } & {}>[] | undefined;
        alerting?: Readonly<{
            status?: string | undefined;
            summary?: Readonly<{
                new?: Readonly<{
                    count?: string | number | undefined;
                } & {}> | undefined;
                ongoing?: Readonly<{
                    count?: string | number | undefined;
                } & {}> | undefined;
                recovered?: Readonly<{
                    count?: string | number | undefined;
                } & {}> | undefined;
            } & {}> | undefined;
            outcome?: string | undefined;
            instance_id?: string | undefined;
            action_group_id?: string | undefined;
            action_subgroup?: string | undefined;
        } & {}> | undefined;
        server_uuid?: string | undefined;
        space_ids?: string[] | undefined;
        user_api_key?: Readonly<{
            id?: string | undefined;
            name?: string | undefined;
        } & {}> | undefined;
        gap_auto_fill?: Readonly<{
            execution?: Readonly<{
                results?: Readonly<{
                    error?: string | undefined;
                    status?: string | undefined;
                    rule_id?: string | undefined;
                    processed_gaps?: string | number | undefined;
                } & {}>[] | undefined;
                status?: string | undefined;
                end?: string | undefined;
                start?: string | undefined;
                duration_ms?: string | number | undefined;
                rule_ids?: string[] | undefined;
                task_params?: Readonly<{
                    name?: string | undefined;
                    interval?: string | undefined;
                    num_retries?: string | number | undefined;
                    gap_fill_range?: string | undefined;
                    max_backfills?: string | number | undefined;
                } & {}> | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
    } & {}> | undefined;
    event?: Readonly<{
        id?: string | undefined;
        provider?: string | undefined;
        url?: string | undefined;
        code?: string | undefined;
        type?: string[] | undefined;
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
        category?: string[] | undefined;
        reason?: string | undefined;
        outcome?: string | undefined;
        ingested?: string | undefined;
        module?: string | undefined;
        reference?: string | undefined;
        risk_score?: number | undefined;
        risk_score_norm?: number | undefined;
        sequence?: string | number | undefined;
    } & {}> | undefined;
    ecs?: Readonly<{
        version?: string | undefined;
    } & {}> | undefined;
} & {}> | undefined>;
export {};
