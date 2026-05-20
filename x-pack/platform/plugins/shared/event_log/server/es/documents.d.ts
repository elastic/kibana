import type { EsNames } from './names';
export declare function getIndexTemplate(esNames: EsNames): {
    _meta: {
        description: string;
        managed: boolean;
    };
    index_patterns: string[];
    data_stream: {
        hidden: boolean;
    };
    priority: number;
    template: {
        settings: {
            hidden: boolean;
            number_of_shards: number;
            auto_expand_replicas: string;
        };
        lifecycle: {
            data_retention: string;
        };
        mappings: {
            dynamic: string;
            properties: {
                "@timestamp": {
                    type: string;
                };
                message: {
                    norms: boolean;
                    type: string;
                };
                tags: {
                    ignore_above: number;
                    type: string;
                    meta: {
                        isArray: string;
                    };
                };
                ecs: {
                    properties: {
                        version: {
                            ignore_above: number;
                            type: string;
                        };
                    };
                };
                error: {
                    properties: {
                        code: {
                            ignore_above: number;
                            type: string;
                        };
                        id: {
                            ignore_above: number;
                            type: string;
                        };
                        message: {
                            norms: boolean;
                            type: string;
                        };
                        stack_trace: {
                            doc_values: boolean;
                            fields: {
                                text: {
                                    norms: boolean;
                                    type: string;
                                };
                            };
                            ignore_above: number;
                            index: boolean;
                            type: string;
                        };
                        type: {
                            ignore_above: number;
                            type: string;
                        };
                    };
                };
                event: {
                    properties: {
                        action: {
                            ignore_above: number;
                            type: string;
                        };
                        category: {
                            ignore_above: number;
                            type: string;
                            meta: {
                                isArray: string;
                            };
                        };
                        code: {
                            ignore_above: number;
                            type: string;
                        };
                        created: {
                            type: string;
                        };
                        dataset: {
                            ignore_above: number;
                            type: string;
                        };
                        duration: {
                            type: string;
                        };
                        end: {
                            type: string;
                        };
                        hash: {
                            ignore_above: number;
                            type: string;
                        };
                        id: {
                            ignore_above: number;
                            type: string;
                        };
                        ingested: {
                            type: string;
                        };
                        kind: {
                            ignore_above: number;
                            type: string;
                        };
                        module: {
                            ignore_above: number;
                            type: string;
                        };
                        original: {
                            doc_values: boolean;
                            ignore_above: number;
                            index: boolean;
                            type: string;
                        };
                        outcome: {
                            ignore_above: number;
                            type: string;
                        };
                        provider: {
                            ignore_above: number;
                            type: string;
                        };
                        reason: {
                            ignore_above: number;
                            type: string;
                        };
                        reference: {
                            ignore_above: number;
                            type: string;
                        };
                        risk_score: {
                            type: string;
                        };
                        risk_score_norm: {
                            type: string;
                        };
                        sequence: {
                            type: string;
                        };
                        severity: {
                            type: string;
                        };
                        start: {
                            type: string;
                        };
                        timezone: {
                            ignore_above: number;
                            type: string;
                        };
                        type: {
                            ignore_above: number;
                            type: string;
                            meta: {
                                isArray: string;
                            };
                        };
                        url: {
                            ignore_above: number;
                            type: string;
                        };
                    };
                };
                log: {
                    properties: {
                        level: {
                            ignore_above: number;
                            type: string;
                        };
                        logger: {
                            ignore_above: number;
                            type: string;
                        };
                    };
                };
                rule: {
                    properties: {
                        author: {
                            ignore_above: number;
                            type: string;
                            meta: {
                                isArray: string;
                            };
                        };
                        category: {
                            ignore_above: number;
                            type: string;
                        };
                        description: {
                            ignore_above: number;
                            type: string;
                        };
                        id: {
                            ignore_above: number;
                            type: string;
                        };
                        license: {
                            ignore_above: number;
                            type: string;
                        };
                        name: {
                            ignore_above: number;
                            type: string;
                        };
                        reference: {
                            ignore_above: number;
                            type: string;
                        };
                        ruleset: {
                            ignore_above: number;
                            type: string;
                        };
                        uuid: {
                            ignore_above: number;
                            type: string;
                        };
                        version: {
                            ignore_above: number;
                            type: string;
                        };
                    };
                };
                user: {
                    properties: {
                        name: {
                            fields: {
                                text: {
                                    norms: boolean;
                                    type: string;
                                };
                            };
                            ignore_above: number;
                            type: string;
                        };
                        id: {
                            ignore_above: number;
                            type: string;
                        };
                    };
                };
                kibana: {
                    properties: {
                        server_uuid: {
                            type: string;
                            ignore_above: number;
                        };
                        task: {
                            properties: {
                                id: {
                                    type: string;
                                };
                                type: {
                                    type: string;
                                    ignore_above: number;
                                };
                                scheduled: {
                                    type: string;
                                };
                                schedule_delay: {
                                    type: string;
                                };
                            };
                        };
                        alerting: {
                            properties: {
                                instance_id: {
                                    type: string;
                                    ignore_above: number;
                                };
                                action_group_id: {
                                    type: string;
                                    ignore_above: number;
                                };
                                action_subgroup: {
                                    type: string;
                                    ignore_above: number;
                                };
                                status: {
                                    type: string;
                                    ignore_above: number;
                                };
                                outcome: {
                                    type: string;
                                    ignore_above: number;
                                };
                                summary: {
                                    properties: {
                                        new: {
                                            properties: {
                                                count: {
                                                    type: string;
                                                };
                                            };
                                        };
                                        ongoing: {
                                            properties: {
                                                count: {
                                                    type: string;
                                                };
                                            };
                                        };
                                        recovered: {
                                            properties: {
                                                count: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                        alert: {
                            properties: {
                                flapping: {
                                    type: string;
                                };
                                maintenance_window_ids: {
                                    type: string;
                                    ignore_above: number;
                                    meta: {
                                        isArray: string;
                                    };
                                };
                                uuid: {
                                    type: string;
                                    ignore_above: number;
                                };
                                deletion: {
                                    properties: {
                                        num_deleted: {
                                            type: string;
                                        };
                                    };
                                };
                                rule: {
                                    properties: {
                                        consumer: {
                                            type: string;
                                            ignore_above: number;
                                        };
                                        gap: {
                                            properties: {
                                                status: {
                                                    type: string;
                                                    ignore_above: number;
                                                };
                                                range: {
                                                    type: string;
                                                    format: string;
                                                };
                                                filled_intervals: {
                                                    type: string;
                                                    format: string;
                                                    meta: {
                                                        isArray: string;
                                                    };
                                                };
                                                unfilled_intervals: {
                                                    format: string;
                                                    type: string;
                                                    meta: {
                                                        isArray: string;
                                                    };
                                                };
                                                in_progress_intervals: {
                                                    format: string;
                                                    type: string;
                                                    meta: {
                                                        isArray: string;
                                                    };
                                                };
                                                total_gap_duration_ms: {
                                                    type: string;
                                                };
                                                filled_duration_ms: {
                                                    type: string;
                                                };
                                                unfilled_duration_ms: {
                                                    type: string;
                                                };
                                                in_progress_duration_ms: {
                                                    type: string;
                                                };
                                                deleted: {
                                                    type: string;
                                                };
                                                updated_at: {
                                                    type: string;
                                                };
                                                failed_auto_fill_attempts: {
                                                    type: string;
                                                };
                                                reason: {
                                                    properties: {
                                                        type: {
                                                            type: string;
                                                            ignore_above: number;
                                                        };
                                                    };
                                                };
                                            };
                                        };
                                        execution: {
                                            properties: {
                                                uuid: {
                                                    type: string;
                                                    ignore_above: number;
                                                };
                                                status: {
                                                    type: string;
                                                    ignore_above: number;
                                                };
                                                status_order: {
                                                    type: string;
                                                };
                                                backfill: {
                                                    properties: {
                                                        id: {
                                                            type: string;
                                                            ignore_above: number;
                                                        };
                                                        start: {
                                                            type: string;
                                                        };
                                                        interval: {
                                                            type: string;
                                                            ignore_above: number;
                                                        };
                                                    };
                                                };
                                                metrics: {
                                                    properties: {
                                                        number_of_triggered_actions: {
                                                            type: string;
                                                        };
                                                        number_of_generated_actions: {
                                                            type: string;
                                                        };
                                                        alert_counts: {
                                                            properties: {
                                                                active: {
                                                                    type: string;
                                                                };
                                                                new: {
                                                                    type: string;
                                                                };
                                                                recovered: {
                                                                    type: string;
                                                                };
                                                            };
                                                        };
                                                        number_of_delayed_alerts: {
                                                            type: string;
                                                        };
                                                        number_of_searches: {
                                                            type: string;
                                                        };
                                                        total_indexing_duration_ms: {
                                                            type: string;
                                                        };
                                                        es_search_duration_ms: {
                                                            type: string;
                                                        };
                                                        total_search_duration_ms: {
                                                            type: string;
                                                        };
                                                        execution_gap_duration_s: {
                                                            type: string;
                                                        };
                                                        gap_range: {
                                                            type: string;
                                                            format: string;
                                                        };
                                                        gap_reason: {
                                                            properties: {
                                                                type: {
                                                                    type: string;
                                                                    ignore_above: number;
                                                                };
                                                            };
                                                        };
                                                        matched_indices_count: {
                                                            type: string;
                                                        };
                                                        frozen_indices_queried_count: {
                                                            type: string;
                                                        };
                                                        rule_type_run_duration_ms: {
                                                            type: string;
                                                        };
                                                        process_alerts_duration_ms: {
                                                            type: string;
                                                        };
                                                        trigger_actions_duration_ms: {
                                                            type: string;
                                                        };
                                                        process_rule_duration_ms: {
                                                            type: string;
                                                        };
                                                        claim_to_start_duration_ms: {
                                                            type: string;
                                                        };
                                                        persist_alerts_duration_ms: {
                                                            type: string;
                                                        };
                                                        prepare_rule_duration_ms: {
                                                            type: string;
                                                        };
                                                        total_run_duration_ms: {
                                                            type: string;
                                                        };
                                                        total_enrichment_duration_ms: {
                                                            type: string;
                                                        };
                                                        update_alerts_duration_ms: {
                                                            type: string;
                                                        };
                                                        alerts_candidate_count: {
                                                            type: string;
                                                        };
                                                        alerts_suppressed_count: {
                                                            type: string;
                                                        };
                                                    };
                                                };
                                            };
                                        };
                                        revision: {
                                            type: string;
                                        };
                                        rule_type_id: {
                                            type: string;
                                            ignore_above: number;
                                        };
                                    };
                                };
                            };
                        };
                        saved_objects: {
                            type: string;
                            properties: {
                                rel: {
                                    type: string;
                                    ignore_above: number;
                                };
                                namespace: {
                                    type: string;
                                    ignore_above: number;
                                };
                                id: {
                                    type: string;
                                    ignore_above: number;
                                };
                                type: {
                                    type: string;
                                    ignore_above: number;
                                };
                                type_id: {
                                    type: string;
                                    ignore_above: number;
                                };
                                space_agnostic: {
                                    type: string;
                                };
                            };
                        };
                        cps_scope_expression: {
                            type: string;
                            ignore_above: number;
                        };
                        cps_scope_linked_projects: {
                            type: string;
                        };
                        space_ids: {
                            type: string;
                            ignore_above: number;
                            meta: {
                                isArray: string;
                            };
                        };
                        version: {
                            type: string;
                        };
                        action: {
                            properties: {
                                name: {
                                    ignore_above: number;
                                    type: string;
                                };
                                id: {
                                    type: string;
                                    ignore_above: number;
                                };
                                type_id: {
                                    type: string;
                                    ignore_above: number;
                                };
                                execution: {
                                    properties: {
                                        source: {
                                            ignore_above: number;
                                            type: string;
                                        };
                                        uuid: {
                                            ignore_above: number;
                                            type: string;
                                        };
                                        gen_ai: {
                                            properties: {
                                                usage: {
                                                    properties: {
                                                        prompt_tokens: {
                                                            type: string;
                                                        };
                                                        completion_tokens: {
                                                            type: string;
                                                        };
                                                        total_tokens: {
                                                            type: string;
                                                        };
                                                    };
                                                };
                                            };
                                        };
                                        usage: {
                                            properties: {
                                                request_body_bytes: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                        user_api_key: {
                            properties: {
                                id: {
                                    type: string;
                                };
                                name: {
                                    type: string;
                                };
                            };
                        };
                        gap_auto_fill: {
                            properties: {
                                execution: {
                                    properties: {
                                        status: {
                                            type: string;
                                        };
                                        start: {
                                            type: string;
                                        };
                                        end: {
                                            type: string;
                                        };
                                        duration_ms: {
                                            type: string;
                                        };
                                        rule_ids: {
                                            type: string;
                                            meta: {
                                                isArray: string;
                                            };
                                        };
                                        task_params: {
                                            properties: {
                                                name: {
                                                    type: string;
                                                };
                                                num_retries: {
                                                    type: string;
                                                };
                                                gap_fill_range: {
                                                    type: string;
                                                };
                                                interval: {
                                                    type: string;
                                                };
                                                max_backfills: {
                                                    type: string;
                                                };
                                            };
                                        };
                                        results: {
                                            type: string;
                                            properties: {
                                                rule_id: {
                                                    type: string;
                                                };
                                                processed_gaps: {
                                                    type: string;
                                                };
                                                status: {
                                                    type: string;
                                                };
                                                error: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                        alerting_v2: {
                            properties: {
                                dispatcher: {
                                    properties: {
                                        episode_count: {
                                            type: string;
                                        };
                                        episode_ids: {
                                            type: string;
                                            ignore_above: number;
                                            meta: {
                                                isArray: string;
                                            };
                                        };
                                        rule_count: {
                                            type: string;
                                        };
                                        rule_ids: {
                                            type: string;
                                            ignore_above: number;
                                            meta: {
                                                isArray: string;
                                            };
                                        };
                                        action_group_count: {
                                            type: string;
                                        };
                                        action_group_ids: {
                                            type: string;
                                            ignore_above: number;
                                            meta: {
                                                isArray: string;
                                            };
                                        };
                                        workflow_ids: {
                                            type: string;
                                            ignore_above: number;
                                            meta: {
                                                isArray: string;
                                            };
                                        };
                                        workflow_execution_ids: {
                                            type: string;
                                            ignore_above: number;
                                            meta: {
                                                isArray: string;
                                            };
                                        };
                                        execution: {
                                            properties: {
                                                uuid: {
                                                    type: string;
                                                    ignore_above: number;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};
