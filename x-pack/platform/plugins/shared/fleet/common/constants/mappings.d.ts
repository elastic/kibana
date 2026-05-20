/**
 * ATTENTION: Mappings for Fleet are defined in the Elasticsearch repo.
 *
 * The following mappings declared here closely mirror them
 * But they are only used to perform validation on the endpoints using ListWithKuery
 * They're needed to perform searches on these mapping trough the KQL searchboxes in the UI.
 * Whenever a field is added on any of these mappings in ES, make sure to add it here as well
 */
export declare const AGENT_POLICY_MAPPINGS: {
    readonly properties: {
        readonly agent_features: {
            readonly properties: {
                readonly name: {
                    readonly type: "keyword";
                };
                readonly enabled: {
                    readonly type: "boolean";
                };
            };
        };
        readonly data_output_id: {
            readonly type: "keyword";
        };
        readonly description: {
            readonly type: "text";
        };
        readonly download_source_id: {
            readonly type: "keyword";
        };
        readonly fleet_server_host_id: {
            readonly type: "keyword";
        };
        readonly inactivity_timeout: {
            readonly type: "integer";
        };
        readonly is_default: {
            readonly type: "boolean";
        };
        readonly is_default_fleet_server: {
            readonly type: "boolean";
        };
        readonly is_managed: {
            readonly type: "boolean";
        };
        readonly is_preconfigured: {
            readonly type: "keyword";
        };
        readonly is_protected: {
            readonly type: "boolean";
        };
        readonly monitoring_enabled: {
            readonly type: "keyword";
            readonly index: false;
        };
        readonly monitoring_output_id: {
            readonly type: "keyword";
        };
        readonly name: {
            readonly type: "keyword";
        };
        readonly namespace: {
            readonly type: "keyword";
        };
        readonly revision: {
            readonly type: "integer";
        };
        readonly schema_version: {
            readonly type: "version";
        };
        readonly status: {
            readonly type: "keyword";
        };
        readonly unenroll_timeout: {
            readonly type: "integer";
        };
        readonly updated_at: {
            readonly type: "date";
        };
        readonly updated_by: {
            readonly type: "keyword";
        };
        readonly supports_agentless: {
            readonly type: "boolean";
        };
    };
};
export declare const PACKAGE_POLICIES_MAPPINGS: {
    readonly properties: {
        readonly name: {
            readonly type: "keyword";
        };
        readonly description: {
            readonly type: "text";
        };
        readonly namespace: {
            readonly type: "keyword";
        };
        readonly enabled: {
            readonly type: "boolean";
        };
        readonly is_managed: {
            readonly type: "boolean";
        };
        readonly policy_id: {
            readonly type: "keyword";
        };
        readonly policy_ids: {
            readonly type: "keyword";
        };
        readonly output_id: {
            readonly type: "keyword";
        };
        readonly package: {
            readonly properties: {
                readonly name: {
                    readonly type: "keyword";
                };
                readonly title: {
                    readonly type: "keyword";
                };
                readonly version: {
                    readonly type: "keyword";
                };
            };
        };
        readonly elasticsearch: {
            readonly dynamic: false;
            readonly properties: {};
        };
        readonly vars: {
            readonly type: "flattened";
        };
        readonly inputs: {
            readonly dynamic: false;
            readonly properties: {};
        };
        readonly secret_references: {
            readonly properties: {
                readonly id: {
                    readonly type: "keyword";
                };
            };
        };
        readonly supports_agentless: {
            readonly type: "boolean";
        };
        readonly revision: {
            readonly type: "integer";
        };
        readonly updated_at: {
            readonly type: "date";
        };
        readonly updated_by: {
            readonly type: "keyword";
        };
        readonly created_at: {
            readonly type: "date";
        };
        readonly created_by: {
            readonly type: "keyword";
        };
    };
};
export declare const AGENT_MAPPINGS: {
    readonly properties: {
        readonly access_api_key_id: {
            readonly type: "keyword";
        };
        readonly action_seq_no: {
            readonly type: "integer";
        };
        readonly active: {
            readonly type: "boolean";
        };
        readonly agent: {
            readonly properties: {
                readonly id: {
                    readonly type: "keyword";
                };
                readonly version: {
                    readonly type: "keyword";
                };
                readonly type: {
                    readonly type: "keyword";
                };
            };
        };
        readonly default_api_key: {
            readonly type: "keyword";
        };
        readonly default_api_key_id: {
            readonly type: "keyword";
        };
        readonly enrollment_id: {
            readonly type: "keyword";
        };
        readonly enrolled_at: {
            readonly type: "date";
        };
        readonly last_checkin: {
            readonly type: "date";
        };
        readonly last_checkin_message: {
            readonly type: "text";
            readonly properties: {
                readonly keyword: {
                    readonly type: "keyword";
                };
            };
        };
        readonly last_checkin_status: {
            readonly type: "keyword";
        };
        readonly last_updated: {
            readonly type: "date";
        };
        readonly local_metadata: {
            readonly properties: {
                readonly elastic: {
                    readonly properties: {
                        readonly agent: {
                            readonly properties: {
                                readonly build: {
                                    readonly properties: {
                                        readonly original: {
                                            readonly type: "text";
                                            readonly properties: {
                                                readonly keyword: {
                                                    readonly type: "keyword";
                                                };
                                            };
                                        };
                                    };
                                };
                                readonly id: {
                                    readonly type: "keyword";
                                };
                                readonly log_level: {
                                    readonly type: "keyword";
                                };
                                readonly snapshot: {
                                    readonly type: "boolean";
                                };
                                readonly upgradeable: {
                                    readonly type: "boolean";
                                };
                                readonly version: {
                                    readonly type: "text";
                                    readonly properties: {
                                        readonly keyword: {
                                            readonly type: "keyword";
                                        };
                                    };
                                };
                                readonly unprivileged: {
                                    readonly type: "boolean";
                                };
                            };
                        };
                    };
                };
                readonly host: {
                    readonly properties: {
                        readonly architecture: {
                            readonly type: "keyword";
                        };
                        readonly hostname: {
                            readonly type: "text";
                            readonly properties: {
                                readonly keyword: {
                                    readonly type: "keyword";
                                };
                            };
                        };
                        readonly id: {
                            readonly type: "keyword";
                        };
                        readonly ip: {
                            readonly type: "text";
                            readonly properties: {
                                readonly keyword: {
                                    readonly type: "keyword";
                                };
                            };
                        };
                        readonly mac: {
                            readonly type: "text";
                            readonly properties: {
                                readonly keyword: {
                                    readonly type: "keyword";
                                };
                            };
                        };
                        readonly name: {
                            readonly type: "text";
                            readonly properties: {
                                readonly keyword: {
                                    readonly type: "keyword";
                                };
                            };
                        };
                    };
                };
                readonly os: {
                    readonly properties: {
                        readonly family: {
                            readonly type: "keyword";
                        };
                        readonly full: {
                            readonly type: "text";
                            readonly properties: {
                                readonly keyword: {
                                    readonly type: "keyword";
                                };
                            };
                        };
                        readonly kernel: {
                            readonly type: "text";
                            readonly properties: {
                                readonly keyword: {
                                    readonly type: "keyword";
                                };
                            };
                        };
                        readonly name: {
                            readonly type: "text";
                            readonly properties: {
                                readonly keyword: {
                                    readonly type: "keyword";
                                };
                            };
                        };
                        readonly platform: {
                            readonly type: "keyword";
                        };
                        readonly version: {
                            readonly type: "text";
                            readonly properties: {
                                readonly keyword: {
                                    readonly type: "keyword";
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly namespaces: {
            readonly type: "keyword";
        };
        readonly packages: {
            readonly type: "keyword";
        };
        readonly policy_output_permissions_hash: {
            readonly type: "keyword";
        };
        readonly policy_coordinator_idx: {
            readonly type: "integer";
        };
        readonly policy_id: {
            readonly type: "keyword";
        };
        readonly policy_revision_idx: {
            readonly type: "integer";
        };
        readonly type: {
            readonly type: "keyword";
        };
        readonly tags: {
            readonly type: "keyword";
        };
        readonly unenrolled_at: {
            readonly type: "date";
        };
        readonly unenrollment_started_at: {
            readonly type: "date";
        };
        readonly unenrolled_reason: {
            readonly type: "keyword";
        };
        readonly unhealthy_reason: {
            readonly type: "keyword";
        };
        readonly updated_at: {
            readonly type: "date";
        };
        readonly upgrade_started_at: {
            readonly type: "date";
        };
        readonly upgraded_at: {
            readonly type: "date";
        };
        readonly upgrade_status: {
            readonly type: "keyword";
        };
        readonly upgrade_details: {
            readonly properties: {
                readonly target_version: {
                    readonly type: "text";
                    readonly fields: {
                        readonly keyword: {
                            readonly type: "keyword";
                        };
                    };
                };
                readonly action_id: {
                    readonly type: "keyword";
                };
                readonly state: {
                    readonly type: "keyword";
                };
                readonly metadata: {
                    readonly properties: {
                        readonly scheduled_at: {
                            readonly type: "date";
                        };
                        readonly download_percent: {
                            readonly type: "double";
                        };
                        readonly download_rate: {
                            readonly type: "double";
                        };
                        readonly failed_state: {
                            readonly type: "keyword";
                        };
                        readonly error_msg: {
                            readonly type: "text";
                            readonly fields: {
                                readonly keyword: {
                                    readonly type: "keyword";
                                };
                            };
                        };
                        readonly retry_error_msg: {
                            readonly type: "text";
                            readonly fields: {
                                readonly keyword: {
                                    readonly type: "keyword";
                                };
                            };
                        };
                        readonly retry_until: {
                            readonly type: "date";
                        };
                    };
                };
            };
        };
        readonly upgrade_attempts: {
            readonly type: "date";
        };
        readonly status: {
            readonly type: "keyword";
        };
        readonly sequence_num: {
            readonly type: "integer";
        };
        readonly capabilities: {
            readonly type: "keyword";
        };
        readonly identifying_attributes: {
            readonly properties: {
                readonly service: {
                    readonly properties: {
                        readonly name: {
                            readonly type: "keyword";
                        };
                        readonly version: {
                            readonly type: "keyword";
                        };
                        readonly instance: {
                            readonly properties: {
                                readonly id: {
                                    readonly type: "keyword";
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly service: {
            readonly properties: {
                readonly name: {
                    readonly type: "keyword";
                };
                readonly version: {
                    readonly type: "keyword";
                };
                readonly instance: {
                    readonly properties: {
                        readonly id: {
                            readonly type: "keyword";
                        };
                    };
                };
            };
        };
        readonly non_identifying_attributes: {
            readonly properties: {
                readonly host: {
                    readonly properties: {
                        readonly arch: {
                            readonly type: "keyword";
                        };
                        readonly name: {
                            readonly type: "keyword";
                        };
                    };
                };
                readonly os: {
                    readonly properties: {
                        readonly type: {
                            readonly type: "keyword";
                        };
                        readonly description: {
                            readonly type: "keyword";
                        };
                    };
                };
                readonly elastic: {
                    readonly properties: {
                        readonly display: {
                            readonly properties: {
                                readonly name: {
                                    readonly type: "keyword";
                                };
                            };
                        };
                        readonly collector: {
                            readonly properties: {
                                readonly group: {
                                    readonly type: "keyword";
                                };
                                readonly group_name: {
                                    readonly type: "keyword";
                                };
                            };
                        };
                    };
                };
                readonly config: {
                    readonly properties: {
                        readonly description: {
                            readonly type: "keyword";
                        };
                        readonly name: {
                            readonly type: "keyword";
                        };
                    };
                };
                readonly deployment: {
                    readonly properties: {
                        readonly environment: {
                            readonly properties: {
                                readonly name: {
                                    readonly type: "keyword";
                                };
                            };
                        };
                    };
                };
            };
        };
        readonly host: {
            readonly properties: {
                readonly arch: {
                    readonly type: "keyword";
                };
                readonly name: {
                    readonly type: "keyword";
                };
            };
        };
        readonly os: {
            readonly properties: {
                readonly type: {
                    readonly type: "keyword";
                };
                readonly description: {
                    readonly type: "keyword";
                };
            };
        };
        readonly elastic: {
            readonly properties: {
                readonly display: {
                    readonly properties: {
                        readonly name: {
                            readonly type: "keyword";
                        };
                    };
                };
                readonly collector: {
                    readonly properties: {
                        readonly group: {
                            readonly type: "keyword";
                        };
                        readonly group_name: {
                            readonly type: "keyword";
                        };
                    };
                };
            };
        };
        readonly config: {
            readonly properties: {
                readonly description: {
                    readonly type: "keyword";
                };
                readonly name: {
                    readonly type: "keyword";
                };
            };
        };
        readonly deployment: {
            readonly properties: {
                readonly environment: {
                    readonly properties: {
                        readonly name: {
                            readonly type: "keyword";
                        };
                    };
                };
            };
        };
    };
};
export declare const ENROLLMENT_API_KEY_MAPPINGS: {
    readonly properties: {
        readonly active: {
            readonly type: "boolean";
        };
        readonly api_key: {
            readonly type: "keyword";
        };
        readonly api_key_id: {
            readonly type: "keyword";
        };
        readonly created_at: {
            readonly type: "date";
        };
        readonly expire_at: {
            readonly type: "date";
        };
        readonly name: {
            readonly type: "keyword";
        };
        readonly policy_id: {
            readonly type: "keyword";
        };
        readonly updated_at: {
            readonly type: "date";
        };
        readonly hidden: {
            readonly type: "boolean";
        };
    };
};
