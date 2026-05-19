export declare const GetOneOutputRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        outputId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const DeleteOutputRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        outputId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const DeleteOutputResponseSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
}>;
export declare const GenerateLogstashApiKeyResponseSchema: import("@kbn/config-schema").ObjectType<{
    api_key: import("@kbn/config-schema").Type<string>;
}>;
export declare const GetOutputsRequestSchema: {};
export declare const GetOutputsResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<any[]>;
    total: import("@kbn/config-schema").Type<number>;
    page: import("@kbn/config-schema").Type<number>;
    perPage: import("@kbn/config-schema").Type<number>;
}>;
export declare const PostOutputRequestSchema: {
    body: import("@kbn/config-schema").Type<Readonly<{
        id?: string | undefined;
        ssl?: Readonly<{
            certificate?: string | undefined;
            key?: string | undefined;
            certificate_authorities?: string[] | undefined;
            verification_mode?: "full" | "none" | "certificate" | "strict" | undefined;
        } & {}> | null | undefined;
        shipper?: Readonly<{} & {
            compression_level: number | null;
            disk_queue_enabled: boolean | null;
            disk_queue_path: string | null;
            disk_queue_max_size: number | null;
            disk_queue_encryption_enabled: boolean | null;
            disk_queue_compression_enabled: boolean | null;
            loadbalance: boolean | null;
            mem_queue_events: number | null;
            queue_flush_timeout: number | null;
            max_batch_bytes: number | null;
        }> | null | undefined;
        secrets?: Readonly<{
            ssl?: Readonly<{
                key?: string | Readonly<{
                    hash?: string | undefined;
                } & {
                    id: string;
                }> | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        is_preconfigured?: boolean | undefined;
        preset?: "custom" | "scale" | "latency" | "throughput" | "balanced" | undefined;
        otel_exporter_config_yaml?: string | null | undefined;
        otel_disable_beatsauth?: boolean | null | undefined;
        is_internal?: boolean | undefined;
        ca_sha256?: string | null | undefined;
        ca_trusted_fingerprint?: string | null | undefined;
        config_yaml?: string | null | undefined;
        proxy_id?: string | null | undefined;
        allow_edit?: string[] | undefined;
        write_to_logs_streams?: boolean | null | undefined;
    } & {
        hosts: string[];
        name: string;
        type: "elasticsearch";
        is_default: boolean;
        is_default_monitoring: boolean;
    }> | Readonly<{
        id?: string | undefined;
        ssl?: Readonly<{
            certificate?: string | undefined;
            key?: string | undefined;
            certificate_authorities?: string[] | undefined;
            verification_mode?: "full" | "none" | "certificate" | "strict" | undefined;
        } & {}> | null | undefined;
        shipper?: Readonly<{} & {
            compression_level: number | null;
            disk_queue_enabled: boolean | null;
            disk_queue_path: string | null;
            disk_queue_max_size: number | null;
            disk_queue_encryption_enabled: boolean | null;
            disk_queue_compression_enabled: boolean | null;
            loadbalance: boolean | null;
            mem_queue_events: number | null;
            queue_flush_timeout: number | null;
            max_batch_bytes: number | null;
        }> | null | undefined;
        secrets?: Readonly<{
            ssl?: Readonly<{
                key?: string | Readonly<{
                    hash?: string | undefined;
                } & {
                    id: string;
                }> | undefined;
            } & {}> | undefined;
            service_token?: string | Readonly<{
                hash?: string | undefined;
            } & {
                id: string;
            }> | undefined;
        } & {}> | undefined;
        is_preconfigured?: boolean | undefined;
        preset?: "custom" | "scale" | "latency" | "throughput" | "balanced" | undefined;
        otel_exporter_config_yaml?: string | null | undefined;
        otel_disable_beatsauth?: boolean | null | undefined;
        is_internal?: boolean | undefined;
        ca_sha256?: string | null | undefined;
        ca_trusted_fingerprint?: string | null | undefined;
        config_yaml?: string | null | undefined;
        proxy_id?: string | null | undefined;
        allow_edit?: string[] | undefined;
        write_to_logs_streams?: boolean | null | undefined;
        service_token?: string | null | undefined;
        sync_integrations?: boolean | undefined;
        kibana_url?: string | null | undefined;
        kibana_api_key?: string | null | undefined;
        sync_uninstalled_integrations?: boolean | undefined;
    } & {
        hosts: string[];
        name: string;
        type: "remote_elasticsearch";
        is_default: boolean;
        is_default_monitoring: boolean;
    }> | Readonly<{
        id?: string | undefined;
        ssl?: Readonly<{
            certificate?: string | undefined;
            key?: string | undefined;
            certificate_authorities?: string[] | undefined;
            verification_mode?: "full" | "none" | "certificate" | "strict" | undefined;
        } & {}> | null | undefined;
        shipper?: Readonly<{} & {
            compression_level: number | null;
            disk_queue_enabled: boolean | null;
            disk_queue_path: string | null;
            disk_queue_max_size: number | null;
            disk_queue_encryption_enabled: boolean | null;
            disk_queue_compression_enabled: boolean | null;
            loadbalance: boolean | null;
            mem_queue_events: number | null;
            queue_flush_timeout: number | null;
            max_batch_bytes: number | null;
        }> | null | undefined;
        secrets?: Readonly<{
            ssl?: Readonly<{
                key?: string | Readonly<{
                    hash?: string | undefined;
                } & {
                    id: string;
                }> | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        is_preconfigured?: boolean | undefined;
        otel_exporter_config_yaml?: string | null | undefined;
        otel_disable_beatsauth?: boolean | null | undefined;
        is_internal?: boolean | undefined;
        ca_sha256?: string | null | undefined;
        ca_trusted_fingerprint?: string | null | undefined;
        config_yaml?: string | null | undefined;
        proxy_id?: string | null | undefined;
        allow_edit?: string[] | undefined;
    } & {
        hosts: string[];
        name: string;
        type: "logstash";
        is_default: boolean;
        is_default_monitoring: boolean;
    }> | Readonly<{
        id?: string | undefined;
        hash?: Readonly<{
            hash?: string | undefined;
            random?: boolean | undefined;
        } & {}> | undefined;
        version?: string | undefined;
        headers?: Readonly<{} & {
            key: string;
            value: string;
        }>[] | undefined;
        ssl?: Readonly<{
            certificate?: string | undefined;
            key?: string | undefined;
            certificate_authorities?: string[] | undefined;
            verification_mode?: "full" | "none" | "certificate" | "strict" | undefined;
        } & {}> | null | undefined;
        key?: string | undefined;
        timeout?: number | undefined;
        password?: string | null | undefined;
        compression?: "none" | "gzip" | "snappy" | "lz4" | undefined;
        username?: string | null | undefined;
        random?: Readonly<{
            group_events?: number | undefined;
        } & {}> | undefined;
        partition?: "hash" | "random" | "round_robin" | undefined;
        shipper?: Readonly<{} & {
            compression_level: number | null;
            disk_queue_enabled: boolean | null;
            disk_queue_path: string | null;
            disk_queue_max_size: number | null;
            disk_queue_encryption_enabled: boolean | null;
            disk_queue_compression_enabled: boolean | null;
            loadbalance: boolean | null;
            mem_queue_events: number | null;
            queue_flush_timeout: number | null;
            max_batch_bytes: number | null;
        }> | null | undefined;
        client_id?: string | undefined;
        secrets?: Readonly<{
            ssl?: Readonly<{} & {
                key: string | Readonly<{
                    hash?: string | undefined;
                } & {
                    id: string;
                }>;
            }> | undefined;
            password?: string | Readonly<{
                hash?: string | undefined;
            } & {
                id: string;
            }> | undefined;
        } & {}> | undefined;
        topic?: string | undefined;
        is_preconfigured?: boolean | undefined;
        compression_level?: number | null | undefined;
        otel_exporter_config_yaml?: string | null | undefined;
        otel_disable_beatsauth?: boolean | null | undefined;
        is_internal?: boolean | undefined;
        ca_sha256?: string | null | undefined;
        ca_trusted_fingerprint?: string | null | undefined;
        config_yaml?: string | null | undefined;
        proxy_id?: string | null | undefined;
        allow_edit?: string[] | undefined;
        connection_type?: "plaintext" | "encryption" | undefined;
        sasl?: Readonly<{
            mechanism?: "PLAIN" | "SCRAM-SHA-256" | "SCRAM-SHA-512" | undefined;
        } & {}> | null | undefined;
        round_robin?: Readonly<{
            group_events?: number | undefined;
        } & {}> | undefined;
        broker_timeout?: number | undefined;
        required_acks?: 0 | 1 | -1 | undefined;
    } & {
        hosts: string[];
        name: string;
        type: "kafka";
        is_default: boolean;
        is_default_monitoring: boolean;
        auth_type: "ssl" | "none" | "kerberos" | "user_pass";
    }>>;
};
export declare const PutOutputRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        outputId: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").Type<Readonly<{
        hosts?: string[] | undefined;
        name?: string | undefined;
        id?: string | undefined;
        type?: "elasticsearch" | undefined;
        ssl?: Readonly<{
            certificate?: string | undefined;
            key?: string | undefined;
            certificate_authorities?: string[] | undefined;
            verification_mode?: "full" | "none" | "certificate" | "strict" | undefined;
        } & {}> | null | undefined;
        shipper?: Readonly<{} & {
            compression_level: number | null;
            disk_queue_enabled: boolean | null;
            disk_queue_path: string | null;
            disk_queue_max_size: number | null;
            disk_queue_encryption_enabled: boolean | null;
            disk_queue_compression_enabled: boolean | null;
            loadbalance: boolean | null;
            mem_queue_events: number | null;
            queue_flush_timeout: number | null;
            max_batch_bytes: number | null;
        }> | null | undefined;
        secrets?: Readonly<{
            ssl?: Readonly<{
                key?: string | Readonly<{
                    hash?: string | undefined;
                } & {
                    id: string;
                }> | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        is_preconfigured?: boolean | undefined;
        is_default?: boolean | undefined;
        preset?: "custom" | "scale" | "latency" | "throughput" | "balanced" | undefined;
        otel_exporter_config_yaml?: string | null | undefined;
        otel_disable_beatsauth?: boolean | null | undefined;
        is_default_monitoring?: boolean | undefined;
        is_internal?: boolean | undefined;
        ca_sha256?: string | null | undefined;
        ca_trusted_fingerprint?: string | null | undefined;
        config_yaml?: string | null | undefined;
        proxy_id?: string | null | undefined;
        allow_edit?: string[] | undefined;
        write_to_logs_streams?: boolean | null | undefined;
    } & {}> | Readonly<{
        hosts?: string[] | undefined;
        name?: string | undefined;
        id?: string | undefined;
        type?: "remote_elasticsearch" | undefined;
        ssl?: Readonly<{
            certificate?: string | undefined;
            key?: string | undefined;
            certificate_authorities?: string[] | undefined;
            verification_mode?: "full" | "none" | "certificate" | "strict" | undefined;
        } & {}> | null | undefined;
        shipper?: Readonly<{} & {
            compression_level: number | null;
            disk_queue_enabled: boolean | null;
            disk_queue_path: string | null;
            disk_queue_max_size: number | null;
            disk_queue_encryption_enabled: boolean | null;
            disk_queue_compression_enabled: boolean | null;
            loadbalance: boolean | null;
            mem_queue_events: number | null;
            queue_flush_timeout: number | null;
            max_batch_bytes: number | null;
        }> | null | undefined;
        secrets?: Readonly<{
            ssl?: Readonly<{
                key?: string | Readonly<{
                    hash?: string | undefined;
                } & {
                    id: string;
                }> | undefined;
            } & {}> | undefined;
            service_token?: string | Readonly<{
                hash?: string | undefined;
            } & {
                id: string;
            }> | undefined;
        } & {}> | undefined;
        is_preconfigured?: boolean | undefined;
        is_default?: boolean | undefined;
        preset?: "custom" | "scale" | "latency" | "throughput" | "balanced" | undefined;
        otel_exporter_config_yaml?: string | null | undefined;
        otel_disable_beatsauth?: boolean | null | undefined;
        is_default_monitoring?: boolean | undefined;
        is_internal?: boolean | undefined;
        ca_sha256?: string | null | undefined;
        ca_trusted_fingerprint?: string | null | undefined;
        config_yaml?: string | null | undefined;
        proxy_id?: string | null | undefined;
        allow_edit?: string[] | undefined;
        write_to_logs_streams?: boolean | null | undefined;
        service_token?: string | null | undefined;
        sync_integrations?: boolean | undefined;
        kibana_url?: string | null | undefined;
        kibana_api_key?: string | null | undefined;
        sync_uninstalled_integrations?: boolean | undefined;
    } & {}> | Readonly<{
        hosts?: string[] | undefined;
        name?: string | undefined;
        id?: string | undefined;
        type?: "logstash" | undefined;
        ssl?: Readonly<{
            certificate?: string | undefined;
            key?: string | undefined;
            certificate_authorities?: string[] | undefined;
            verification_mode?: "full" | "none" | "certificate" | "strict" | undefined;
        } & {}> | null | undefined;
        shipper?: Readonly<{} & {
            compression_level: number | null;
            disk_queue_enabled: boolean | null;
            disk_queue_path: string | null;
            disk_queue_max_size: number | null;
            disk_queue_encryption_enabled: boolean | null;
            disk_queue_compression_enabled: boolean | null;
            loadbalance: boolean | null;
            mem_queue_events: number | null;
            queue_flush_timeout: number | null;
            max_batch_bytes: number | null;
        }> | null | undefined;
        secrets?: Readonly<{
            ssl?: Readonly<{
                key?: string | Readonly<{
                    hash?: string | undefined;
                } & {
                    id: string;
                }> | undefined;
            } & {}> | undefined;
        } & {}> | undefined;
        is_preconfigured?: boolean | undefined;
        is_default?: boolean | undefined;
        otel_exporter_config_yaml?: string | null | undefined;
        otel_disable_beatsauth?: boolean | null | undefined;
        is_default_monitoring?: boolean | undefined;
        is_internal?: boolean | undefined;
        ca_sha256?: string | null | undefined;
        ca_trusted_fingerprint?: string | null | undefined;
        config_yaml?: string | null | undefined;
        proxy_id?: string | null | undefined;
        allow_edit?: string[] | undefined;
    } & {}> | Readonly<{
        hosts?: string[] | undefined;
        id?: string | undefined;
        type?: "kafka" | undefined;
        hash?: Readonly<{
            hash?: string | undefined;
            random?: boolean | undefined;
        } & {}> | undefined;
        version?: string | undefined;
        headers?: Readonly<{} & {
            key: string;
            value: string;
        }>[] | undefined;
        ssl?: Readonly<{
            certificate?: string | undefined;
            key?: string | undefined;
            certificate_authorities?: string[] | undefined;
            verification_mode?: "full" | "none" | "certificate" | "strict" | undefined;
        } & {}> | null | undefined;
        key?: string | undefined;
        timeout?: number | undefined;
        password?: string | null | undefined;
        compression?: "none" | "gzip" | "snappy" | "lz4" | undefined;
        username?: string | null | undefined;
        random?: Readonly<{
            group_events?: number | undefined;
        } & {}> | undefined;
        partition?: "hash" | "random" | "round_robin" | undefined;
        shipper?: Readonly<{} & {
            compression_level: number | null;
            disk_queue_enabled: boolean | null;
            disk_queue_path: string | null;
            disk_queue_max_size: number | null;
            disk_queue_encryption_enabled: boolean | null;
            disk_queue_compression_enabled: boolean | null;
            loadbalance: boolean | null;
            mem_queue_events: number | null;
            queue_flush_timeout: number | null;
            max_batch_bytes: number | null;
        }> | null | undefined;
        client_id?: string | undefined;
        secrets?: Readonly<{
            ssl?: Readonly<{} & {
                key: string | Readonly<{
                    hash?: string | undefined;
                } & {
                    id: string;
                }>;
            }> | undefined;
            password?: string | Readonly<{
                hash?: string | undefined;
            } & {
                id: string;
            }> | undefined;
        } & {}> | undefined;
        topic?: string | undefined;
        is_preconfigured?: boolean | undefined;
        compression_level?: number | null | undefined;
        otel_exporter_config_yaml?: string | null | undefined;
        otel_disable_beatsauth?: boolean | null | undefined;
        is_internal?: boolean | undefined;
        ca_sha256?: string | null | undefined;
        ca_trusted_fingerprint?: string | null | undefined;
        config_yaml?: string | null | undefined;
        proxy_id?: string | null | undefined;
        allow_edit?: string[] | undefined;
        auth_type?: "ssl" | "none" | "kerberos" | "user_pass" | undefined;
        connection_type?: "plaintext" | "encryption" | undefined;
        sasl?: Readonly<{
            mechanism?: "PLAIN" | "SCRAM-SHA-256" | "SCRAM-SHA-512" | undefined;
        } & {}> | null | undefined;
        round_robin?: Readonly<{
            group_events?: number | undefined;
        } & {}> | undefined;
        broker_timeout?: number | undefined;
        required_acks?: 0 | 1 | -1 | undefined;
    } & {
        name: string;
        is_default: boolean;
        is_default_monitoring: boolean;
    }>>;
};
export declare const GetLatestOutputHealthRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        outputId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const GetLatestOutputHealthResponseSchema: import("@kbn/config-schema").ObjectType<{
    state: import("@kbn/config-schema").Type<string>;
    message: import("@kbn/config-schema").Type<string>;
    timestamp: import("@kbn/config-schema").Type<string>;
}>;
