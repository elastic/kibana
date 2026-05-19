export declare const FLEET_INSTALL_FORMAT_VERSION = "1.5.0";
export declare const FLEET_AGENT_POLICIES_SCHEMA_VERSION = "1.1.1";
export declare const FLEET_FINAL_PIPELINE_ID = ".fleet_final_pipeline-1";
export declare const FLEET_EVENT_INGESTED_PIPELINE_ID = ".fleet_event_ingested_pipeline-1";
export declare const FLEET_GLOBALS_COMPONENT_TEMPLATE_NAME = ".fleet_globals-1";
export declare const FLEET_GLOBALS_COMPONENT_TEMPLATE_CONTENT: {
    _meta: import("../../common/types").ESAssetMetadata;
    template: {
        settings: {};
        mappings: {
            _meta: import("../../common/types").ESAssetMetadata;
            dynamic_templates: {
                strings_as_keyword: {
                    mapping: {
                        ignore_above: number;
                        type: string;
                    };
                    match_mapping_type: string;
                };
            }[];
            date_detection: boolean;
        };
    };
};
export declare const FLEET_AGENT_ID_VERIFY_COMPONENT_TEMPLATE_NAME = ".fleet_agent_id_verification-1";
export declare const INGESTED_MAPPING: {
    type: string;
    format: string;
    ignore_malformed: boolean;
};
export declare const FLEET_AGENT_ID_VERIFY_COMPONENT_TEMPLATE_CONTENT: {
    _meta: import("../../common/types").ESAssetMetadata;
    template: {
        settings: {
            index: {
                final_pipeline: string;
            };
        };
        mappings: {
            properties: {
                event: {
                    properties: {
                        ingested: {
                            type: string;
                            format: string;
                            ignore_malformed: boolean;
                        };
                        agent_id_status: {
                            ignore_above: number;
                            type: string;
                        };
                    };
                };
            };
        };
    };
};
export declare const FLEET_EVENT_INGESTED_COMPONENT_TEMPLATE_NAME = ".fleet_event_ingested-1";
export declare const FLEET_EVENT_INGESTED_COMPONENT_TEMPLATE_CONTENT: {
    _meta: import("../../common/types").ESAssetMetadata;
    template: {
        settings: {
            index: {
                final_pipeline: string;
            };
        };
        mappings: {
            properties: {
                event: {
                    properties: {
                        ingested: {
                            type: string;
                            format: string;
                            ignore_malformed: boolean;
                        };
                    };
                };
            };
        };
    };
};
export declare const FLEET_COMPONENT_TEMPLATES: ({
    name: string;
    body: {
        _meta: import("../../common/types").ESAssetMetadata;
        template: {
            settings: {};
            mappings: {
                _meta: import("../../common/types").ESAssetMetadata;
                dynamic_templates: {
                    strings_as_keyword: {
                        mapping: {
                            ignore_above: number;
                            type: string;
                        };
                        match_mapping_type: string;
                    };
                }[];
                date_detection: boolean;
            };
        };
    };
} | {
    name: string;
    body: {
        _meta: import("../../common/types").ESAssetMetadata;
        template: {
            settings: {
                index: {
                    final_pipeline: string;
                };
            };
            mappings: {
                properties: {
                    event: {
                        properties: {
                            ingested: {
                                type: string;
                                format: string;
                                ignore_malformed: boolean;
                            };
                        };
                    };
                };
            };
        };
    };
})[];
export declare const STACK_COMPONENT_TEMPLATE_LOGS_SETTINGS = "logs@settings";
export declare const STACK_COMPONENT_TEMPLATE_LOGS_MAPPINGS = "logs@mappings";
export declare const STACK_COMPONENT_TEMPLATE_METRICS_SETTINGS = "metrics@settings";
export declare const STACK_COMPONENT_TEMPLATE_METRICS_TSDB_SETTINGS = "metrics@tsdb-settings";
export declare const STACK_COMPONENT_TEMPLATE_ECS_MAPPINGS = "ecs@mappings";
export declare const STACK_COMPONENT_TEMPLATE_TRACES_SETTINGS = "traces@settings";
export declare const STACK_COMPONENT_TEMPLATE_TRACES_MAPPINGS = "traces@mappings";
export declare const STACK_COMPONENT_TEMPLATES: string[];
export declare const OTEL_COMPONENT_TEMPLATE_MAPPINGS = "otel@mappings";
export declare const OTEL_COMPONENT_TEMPLATE_SETTINGS = "otel@settings";
export declare const OTEL_COMPONENT_TEMPLATE_METRICS_MAPPINGS = "metrics-otel@mappings";
export declare const OTEL_COMPONENT_TEMPLATE_METRICS_CUSTOM_MAPPINGS = "metrics-otel@custom";
export declare const OTEL_COMPONENT_TEMPLATE_LOGS_MAPPINGS = "logs-otel@mappings";
export declare const OTEL_COMPONENT_TEMPLATE_LOGS_CUSTOM_MAPPINGS = "logs-otel@custom";
export declare const OTEL_COMPONENT_TEMPLATE_TRACES_MAPPINGS = "traces-otel@mappings";
export declare const OTEL_COMPONENT_TEMPLATE_TRACES_CUSTOM_MAPPINGS = "traces-otel@custom";
export declare const OTEL_COMPONENT_SEMCONV_RESOURCE_TO_ECS_MAPPINGS = "semconv-resource-to-ecs@mappings";
export declare const OTEL_METRICS_COMPONENT_TEMPLATES: string[];
export declare const OTEL_LOGS_COMPONENT_TEMPLATES: string[];
export declare const OTEL_TRACES_COMPONENT_TEMPLATES: string[];
export declare const OTEL_COMPONENT_TEMPLATES: string[];
export declare const FLEET_EVENT_INGESTED_PIPELINE_VERSION = 1;
export declare const FLEET_EVENT_INGESTED_PIPELINE_CONTENT: string;
export declare const FLEET_FINAL_PIPELINE_VERSION = 4;
export declare const FLEET_FINAL_PIPELINE_CONTENT: string;
export declare const FILE_STORAGE_METADATA_AGENT_INDEX: string;
export declare const FILE_STORAGE_DATA_AGENT_INDEX: string;
