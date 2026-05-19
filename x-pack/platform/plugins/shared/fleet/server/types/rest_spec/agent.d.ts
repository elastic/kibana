import { RequestDiagnosticsAdditionalMetrics } from '../../../common/types';
export declare const GetAgentsRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        page: import("@kbn/config-schema").Type<number | undefined>;
        perPage: import("@kbn/config-schema").Type<number>;
        kuery: import("@kbn/config-schema").Type<string | undefined>;
        showAgentless: import("@kbn/config-schema").Type<boolean>;
        showInactive: import("@kbn/config-schema").Type<boolean>;
        withMetrics: import("@kbn/config-schema").Type<boolean>;
        showUpgradeable: import("@kbn/config-schema").Type<boolean>;
        getStatusSummary: import("@kbn/config-schema").Type<boolean>;
        sortField: import("@kbn/config-schema").Type<string | undefined>;
        sortOrder: import("@kbn/config-schema").Type<"asc" | "desc" | undefined>;
        searchAfter: import("@kbn/config-schema").Type<string | undefined>;
        openPit: import("@kbn/config-schema").Type<boolean | undefined>;
        pitId: import("@kbn/config-schema").Type<string | undefined>;
        pitKeepAlive: import("@kbn/config-schema").Type<string | undefined>;
    }>;
};
export declare const MigrateOptionsSchema: {
    ca_sha256: import("@kbn/config-schema").Type<string | undefined>;
    certificate_authorities: import("@kbn/config-schema").Type<string | undefined>;
    elastic_agent_cert: import("@kbn/config-schema").Type<string | undefined>;
    elastic_agent_cert_key: import("@kbn/config-schema").Type<string | undefined>;
    elastic_agent_cert_key_passphrase: import("@kbn/config-schema").Type<string | undefined>;
    headers: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
    insecure: import("@kbn/config-schema").Type<boolean | undefined>;
    proxy_disabled: import("@kbn/config-schema").Type<boolean | undefined>;
    proxy_headers: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
    proxy_url: import("@kbn/config-schema").Type<string | undefined>;
    staging: import("@kbn/config-schema").Type<string | undefined>;
    tags: import("@kbn/config-schema").Type<string[] | undefined>;
    replace_token: import("@kbn/config-schema").Type<string | undefined>;
};
export declare const BulkMigrateOptionsSchema: {
    ca_sha256: import("@kbn/config-schema").Type<string | undefined>;
    certificate_authorities: import("@kbn/config-schema").Type<string | undefined>;
    elastic_agent_cert: import("@kbn/config-schema").Type<string | undefined>;
    elastic_agent_cert_key: import("@kbn/config-schema").Type<string | undefined>;
    elastic_agent_cert_key_passphrase: import("@kbn/config-schema").Type<string | undefined>;
    headers: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
    insecure: import("@kbn/config-schema").Type<boolean | undefined>;
    proxy_disabled: import("@kbn/config-schema").Type<boolean | undefined>;
    proxy_headers: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
    proxy_url: import("@kbn/config-schema").Type<string | undefined>;
    staging: import("@kbn/config-schema").Type<string | undefined>;
    tags: import("@kbn/config-schema").Type<string[] | undefined>;
};
export declare const AgentComponentStateSchema: import("@kbn/config-schema").Type<"FAILED" | "HEALTHY" | "STARTING" | "STOPPING" | "CONFIGURING" | "DEGRADED" | "STOPPED">;
export declare const AgentUpgradeStateTypeSchema: import("@kbn/config-schema").Type<"UPG_REQUESTED" | "UPG_SCHEDULED" | "UPG_DOWNLOADING" | "UPG_EXTRACTING" | "UPG_REPLACING" | "UPG_RESTARTING" | "UPG_WATCHING" | "UPG_ROLLBACK" | "UPG_FAILED">;
export declare const AgentStatusSchema: import("@kbn/config-schema").Type<"offline" | "error" | "degraded" | "online" | "inactive" | "uninstalled" | "updating" | "enrolling" | "unenrolling" | "unenrolled" | "orphaned">;
export declare const AgentResponseSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    access_api_key: import("@kbn/config-schema").Type<string | undefined>;
    default_api_key_history: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        retired_at: string;
    }>[] | undefined>;
    outputs: import("@kbn/config-schema").Type<Record<string, Readonly<{
        type?: string | undefined;
        api_key_id?: string | undefined;
        to_retire_api_key_ids?: Readonly<{} & {
            id: string;
            retired_at: string;
        }>[] | undefined;
    } & {}>> | undefined>;
    status: import("@kbn/config-schema").Type<"offline" | "error" | "degraded" | "online" | "inactive" | "uninstalled" | "updating" | "enrolling" | "unenrolling" | "unenrolled" | "orphaned" | undefined>;
    last_known_status: import("@kbn/config-schema").Type<"offline" | "error" | "degraded" | "online" | "inactive" | "uninstalled" | "updating" | "enrolling" | "unenrolling" | "unenrolled" | "orphaned" | undefined>;
    packages: import("@kbn/config-schema").Type<string[]>;
    sort: import("@kbn/config-schema").Type<any[] | undefined>;
    metrics: import("@kbn/config-schema").Type<Readonly<{
        cpu_avg?: number | undefined;
        memory_size_byte_avg?: number | undefined;
    } & {}> | undefined>;
    type: import("@kbn/config-schema").Type<"PERMANENT" | "EPHEMERAL" | "TEMPORARY" | "OPAMP">;
    active: import("@kbn/config-schema").Type<boolean>;
    enrolled_at: import("@kbn/config-schema").Type<string>;
    unenrolled_at: import("@kbn/config-schema").Type<string | undefined>;
    unenrollment_started_at: import("@kbn/config-schema").Type<string | undefined>;
    audit_unenrolled_reason: import("@kbn/config-schema").Type<string | undefined>;
    upgraded_at: import("@kbn/config-schema").Type<string | null | undefined>;
    upgrade_started_at: import("@kbn/config-schema").Type<string | null | undefined>;
    upgrade_details: import("@kbn/config-schema").Type<Readonly<{
        metadata?: Readonly<{
            reason?: string | undefined;
            scheduled_at?: string | undefined;
            download_percent?: number | undefined;
            download_rate?: number | undefined;
            failed_state?: "UPG_REQUESTED" | "UPG_SCHEDULED" | "UPG_DOWNLOADING" | "UPG_EXTRACTING" | "UPG_REPLACING" | "UPG_RESTARTING" | "UPG_WATCHING" | "UPG_ROLLBACK" | "UPG_FAILED" | undefined;
            error_msg?: string | undefined;
            retry_error_msg?: string | undefined;
            retry_until?: string | undefined;
        } & {}> | undefined;
    } & {
        state: "UPG_REQUESTED" | "UPG_SCHEDULED" | "UPG_DOWNLOADING" | "UPG_EXTRACTING" | "UPG_REPLACING" | "UPG_RESTARTING" | "UPG_WATCHING" | "UPG_ROLLBACK" | "UPG_FAILED";
        action_id: string;
        target_version: string;
    }> | null | undefined>;
    upgrade_attempts: import("@kbn/config-schema").Type<string[] | null | undefined>;
    access_api_key_id: import("@kbn/config-schema").Type<string | undefined>;
    default_api_key: import("@kbn/config-schema").Type<string | undefined>;
    default_api_key_id: import("@kbn/config-schema").Type<string | undefined>;
    policy_id: import("@kbn/config-schema").Type<string | undefined>;
    policy_revision: import("@kbn/config-schema").Type<number | null | undefined>;
    last_checkin: import("@kbn/config-schema").Type<string | undefined>;
    last_checkin_status: import("@kbn/config-schema").Type<"error" | "degraded" | "online" | "updating" | "starting" | "disconnected" | undefined>;
    last_checkin_message: import("@kbn/config-schema").Type<string | undefined>;
    user_provided_metadata: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    local_metadata: import("@kbn/config-schema").Type<Record<string, any>>;
    tags: import("@kbn/config-schema").Type<string[] | undefined>;
    components: import("@kbn/config-schema").Type<Readonly<{
        units?: Readonly<{
            payload?: Record<string, any> | undefined;
        } & {
            id: string;
            status: "FAILED" | "HEALTHY" | "STARTING" | "STOPPING" | "CONFIGURING" | "DEGRADED" | "STOPPED";
            message: string;
            type: "" | "output" | "input";
        }>[] | undefined;
    } & {
        id: string;
        status: "FAILED" | "HEALTHY" | "STARTING" | "STOPPING" | "CONFIGURING" | "DEGRADED" | "STOPPED";
        message: string;
        type: string;
    }>[] | undefined>;
    agent: import("@kbn/config-schema").Type<Readonly<{
        type?: string | undefined;
    } & {
        id: string;
        version: string;
    }> | undefined>;
    unhealthy_reason: import("@kbn/config-schema").Type<("output" | "input" | "other")[] | null | undefined>;
    namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
    upgrade: import("@kbn/config-schema").Type<Readonly<{
        rollbacks?: Readonly<{} & {
            version: string;
            valid_until: string;
        }>[] | undefined;
    } & {}> | undefined>;
    identifying_attributes: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
    non_identifying_attributes: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
    sequence_num: import("@kbn/config-schema").Type<number | undefined>;
    capabilities: import("@kbn/config-schema").Type<string[] | undefined>;
    health: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    effective_config: import("@kbn/config-schema").Type<any>;
}>;
export declare const GetAgentsResponseSchema: import("@kbn/config-schema").ObjectType<Omit<{
    items: import("@kbn/config-schema").Type<any[]>;
    total: import("@kbn/config-schema").Type<number>;
    page: import("@kbn/config-schema").Type<number>;
    perPage: import("@kbn/config-schema").Type<number>;
}, "pit" | "nextSearchAfter" | "statusSummary"> & {
    pit: import("@kbn/config-schema").Type<string | undefined>;
    nextSearchAfter: import("@kbn/config-schema").Type<string | undefined>;
    statusSummary: import("@kbn/config-schema").Type<Record<"offline" | "error" | "degraded" | "online" | "inactive" | "uninstalled" | "updating" | "enrolling" | "unenrolling" | "unenrolled" | "orphaned", number> | undefined>;
}>;
export declare const GetAgentResponseSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string>;
        access_api_key: import("@kbn/config-schema").Type<string | undefined>;
        default_api_key_history: import("@kbn/config-schema").Type<Readonly<{} & {
            id: string;
            retired_at: string;
        }>[] | undefined>;
        outputs: import("@kbn/config-schema").Type<Record<string, Readonly<{
            type?: string | undefined;
            api_key_id?: string | undefined;
            to_retire_api_key_ids?: Readonly<{} & {
                id: string;
                retired_at: string;
            }>[] | undefined;
        } & {}>> | undefined>;
        status: import("@kbn/config-schema").Type<"offline" | "error" | "degraded" | "online" | "inactive" | "uninstalled" | "updating" | "enrolling" | "unenrolling" | "unenrolled" | "orphaned" | undefined>;
        last_known_status: import("@kbn/config-schema").Type<"offline" | "error" | "degraded" | "online" | "inactive" | "uninstalled" | "updating" | "enrolling" | "unenrolling" | "unenrolled" | "orphaned" | undefined>;
        packages: import("@kbn/config-schema").Type<string[]>;
        sort: import("@kbn/config-schema").Type<any[] | undefined>;
        metrics: import("@kbn/config-schema").Type<Readonly<{
            cpu_avg?: number | undefined;
            memory_size_byte_avg?: number | undefined;
        } & {}> | undefined>;
        type: import("@kbn/config-schema").Type<"PERMANENT" | "EPHEMERAL" | "TEMPORARY" | "OPAMP">;
        active: import("@kbn/config-schema").Type<boolean>;
        enrolled_at: import("@kbn/config-schema").Type<string>;
        unenrolled_at: import("@kbn/config-schema").Type<string | undefined>;
        unenrollment_started_at: import("@kbn/config-schema").Type<string | undefined>;
        audit_unenrolled_reason: import("@kbn/config-schema").Type<string | undefined>;
        upgraded_at: import("@kbn/config-schema").Type<string | null | undefined>;
        upgrade_started_at: import("@kbn/config-schema").Type<string | null | undefined>;
        upgrade_details: import("@kbn/config-schema").Type<Readonly<{
            metadata?: Readonly<{
                reason?: string | undefined;
                scheduled_at?: string | undefined;
                download_percent?: number | undefined;
                download_rate?: number | undefined;
                failed_state?: "UPG_REQUESTED" | "UPG_SCHEDULED" | "UPG_DOWNLOADING" | "UPG_EXTRACTING" | "UPG_REPLACING" | "UPG_RESTARTING" | "UPG_WATCHING" | "UPG_ROLLBACK" | "UPG_FAILED" | undefined;
                error_msg?: string | undefined;
                retry_error_msg?: string | undefined;
                retry_until?: string | undefined;
            } & {}> | undefined;
        } & {
            state: "UPG_REQUESTED" | "UPG_SCHEDULED" | "UPG_DOWNLOADING" | "UPG_EXTRACTING" | "UPG_REPLACING" | "UPG_RESTARTING" | "UPG_WATCHING" | "UPG_ROLLBACK" | "UPG_FAILED";
            action_id: string;
            target_version: string;
        }> | null | undefined>;
        upgrade_attempts: import("@kbn/config-schema").Type<string[] | null | undefined>;
        access_api_key_id: import("@kbn/config-schema").Type<string | undefined>;
        default_api_key: import("@kbn/config-schema").Type<string | undefined>;
        default_api_key_id: import("@kbn/config-schema").Type<string | undefined>;
        policy_id: import("@kbn/config-schema").Type<string | undefined>;
        policy_revision: import("@kbn/config-schema").Type<number | null | undefined>;
        last_checkin: import("@kbn/config-schema").Type<string | undefined>;
        last_checkin_status: import("@kbn/config-schema").Type<"error" | "degraded" | "online" | "updating" | "starting" | "disconnected" | undefined>;
        last_checkin_message: import("@kbn/config-schema").Type<string | undefined>;
        user_provided_metadata: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
        local_metadata: import("@kbn/config-schema").Type<Record<string, any>>;
        tags: import("@kbn/config-schema").Type<string[] | undefined>;
        components: import("@kbn/config-schema").Type<Readonly<{
            units?: Readonly<{
                payload?: Record<string, any> | undefined;
            } & {
                id: string;
                status: "FAILED" | "HEALTHY" | "STARTING" | "STOPPING" | "CONFIGURING" | "DEGRADED" | "STOPPED";
                message: string;
                type: "" | "output" | "input";
            }>[] | undefined;
        } & {
            id: string;
            status: "FAILED" | "HEALTHY" | "STARTING" | "STOPPING" | "CONFIGURING" | "DEGRADED" | "STOPPED";
            message: string;
            type: string;
        }>[] | undefined>;
        agent: import("@kbn/config-schema").Type<Readonly<{
            type?: string | undefined;
        } & {
            id: string;
            version: string;
        }> | undefined>;
        unhealthy_reason: import("@kbn/config-schema").Type<("output" | "input" | "other")[] | null | undefined>;
        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
        upgrade: import("@kbn/config-schema").Type<Readonly<{
            rollbacks?: Readonly<{} & {
                version: string;
                valid_until: string;
            }>[] | undefined;
        } & {}> | undefined>;
        identifying_attributes: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
        non_identifying_attributes: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
        sequence_num: import("@kbn/config-schema").Type<number | undefined>;
        capabilities: import("@kbn/config-schema").Type<string[] | undefined>;
        health: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
        effective_config: import("@kbn/config-schema").Type<any>;
    }>;
}>;
export declare const GetOneAgentRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentId: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        withMetrics: import("@kbn/config-schema").Type<boolean>;
    }>;
};
export declare const GetAgentEffectiveConfigRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const GetAgentEffectiveConfigResponseSchema: import("@kbn/config-schema").ObjectType<{
    effective_config: import("@kbn/config-schema").Type<any>;
}>;
export declare const PostNewAgentActionRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        action: import("@kbn/config-schema").Type<Readonly<{
            data?: any;
            ack_data?: any;
        } & {
            type: "UNENROLL" | "UPGRADE" | "POLICY_REASSIGN";
        }> | Readonly<{} & {
            type: "SETTINGS";
            data: Readonly<{} & {
                log_level: "error" | "info" | "debug" | "warning" | null;
            }>;
        }>>;
    }>;
    params: import("@kbn/config-schema").ObjectType<{
        agentId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const PostNewAgentActionResponseSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string>;
        type: import("@kbn/config-schema").Type<string>;
        data: import("@kbn/config-schema").Type<any>;
        sent_at: import("@kbn/config-schema").Type<string | undefined>;
        created_at: import("@kbn/config-schema").Type<string>;
        ack_data: import("@kbn/config-schema").Type<any>;
        agents: import("@kbn/config-schema").Type<string[] | undefined>;
        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
        expiration: import("@kbn/config-schema").Type<string | undefined>;
        start_time: import("@kbn/config-schema").Type<string | undefined>;
        minimum_execution_duration: import("@kbn/config-schema").Type<number | undefined>;
        rollout_duration_seconds: import("@kbn/config-schema").Type<number | undefined>;
        source_uri: import("@kbn/config-schema").Type<string | undefined>;
        total: import("@kbn/config-schema").Type<number | undefined>;
    }>;
}>;
export declare const PostCancelActionRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        actionId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const PostRetrieveAgentsByActionsRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        actionIds: import("@kbn/config-schema").Type<string[]>;
    }>;
};
export declare const PostRetrieveAgentsByActionsResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<string[]>;
}>;
export declare const PostAgentUnenrollRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentId: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").Type<Readonly<{
        force?: boolean | undefined;
        revoke?: boolean | undefined;
    } & {}> | null>;
};
export declare const PostBulkAgentUnenrollRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        agents: import("@kbn/config-schema").Type<string | string[]>;
        force: import("@kbn/config-schema").Type<boolean | undefined>;
        revoke: import("@kbn/config-schema").Type<boolean | undefined>;
        batchSize: import("@kbn/config-schema").Type<number | undefined>;
        includeInactive: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
};
export declare const PostRemoveCollectorRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const PostBulkRemoveCollectorsRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        agents: import("@kbn/config-schema").Type<string | string[]>;
        includeInactive: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
};
export declare const PostAgentUpgradeRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentId: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").ObjectType<{
        source_uri: import("@kbn/config-schema").Type<string | undefined>;
        version: import("@kbn/config-schema").Type<string>;
        force: import("@kbn/config-schema").Type<boolean | undefined>;
        skipRateLimitCheck: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
};
export declare const PostBulkAgentUpgradeRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        agents: import("@kbn/config-schema").Type<string | string[]>;
        source_uri: import("@kbn/config-schema").Type<string | undefined>;
        version: import("@kbn/config-schema").Type<string>;
        force: import("@kbn/config-schema").Type<boolean | undefined>;
        skipRateLimitCheck: import("@kbn/config-schema").Type<boolean | undefined>;
        rollout_duration_seconds: import("@kbn/config-schema").Type<number | undefined>;
        start_time: import("@kbn/config-schema").Type<string | undefined>;
        batchSize: import("@kbn/config-schema").Type<number | undefined>;
        includeInactive: import("@kbn/config-schema").Type<boolean>;
    }>;
};
export declare const PostAgentReassignRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentId: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").ObjectType<{
        policy_id: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const PostRequestDiagnosticsActionRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentId: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").Type<Readonly<{
        additional_metrics?: RequestDiagnosticsAdditionalMetrics[] | undefined;
    } & {}> | null>;
};
export declare const PostBulkRequestDiagnosticsActionRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        agents: import("@kbn/config-schema").Type<string | string[]>;
        batchSize: import("@kbn/config-schema").Type<number | undefined>;
        additional_metrics: import("@kbn/config-schema").Type<RequestDiagnosticsAdditionalMetrics[] | undefined>;
    }>;
};
export declare const ListAgentUploadsRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const ListAgentUploadsResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<Readonly<{
        error?: string | undefined;
    } & {
        name: string;
        id: string;
        status: "IN_PROGRESS" | "EXPIRED" | "FAILED" | "AWAITING_UPLOAD" | "READY" | "DELETED";
        actionId: string;
        createTime: string;
        filePath: string;
    }>[]>;
}>;
export declare const GetAgentUploadFileRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        fileId: import("@kbn/config-schema").Type<string>;
        fileName: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const DeleteAgentUploadFileRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        fileId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const DeleteAgentUploadFileResponseSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    deleted: import("@kbn/config-schema").Type<boolean>;
}>;
export declare const PostBulkAgentReassignRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        policy_id: import("@kbn/config-schema").Type<string>;
        agents: import("@kbn/config-schema").Type<string | string[]>;
        batchSize: import("@kbn/config-schema").Type<number | undefined>;
        includeInactive: import("@kbn/config-schema").Type<boolean>;
    }>;
};
export declare const DeleteAgentRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const DeleteAgentResponseSchema: import("@kbn/config-schema").ObjectType<{
    action: import("@kbn/config-schema").Type<"deleted">;
}>;
export declare const UpdateAgentRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentId: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").ObjectType<{
        user_provided_metadata: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
        tags: import("@kbn/config-schema").Type<string[] | undefined>;
    }>;
};
export declare const MigrateSingleAgentRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentId: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").ObjectType<{
        uri: import("@kbn/config-schema").Type<string>;
        enrollment_token: import("@kbn/config-schema").Type<string>;
        settings: import("@kbn/config-schema").Type<Readonly<{
            tags?: string[] | undefined;
            headers?: Record<string, string> | undefined;
            staging?: string | undefined;
            ca_sha256?: string | undefined;
            proxy_url?: string | undefined;
            proxy_headers?: Record<string, string> | undefined;
            certificate_authorities?: string | undefined;
            elastic_agent_cert?: string | undefined;
            elastic_agent_cert_key?: string | undefined;
            elastic_agent_cert_key_passphrase?: string | undefined;
            insecure?: boolean | undefined;
            proxy_disabled?: boolean | undefined;
            replace_token?: string | undefined;
        } & {}> | undefined>;
    }>;
};
export declare const MigrateSingleAgentResponseSchema: import("@kbn/config-schema").ObjectType<{
    actionId: import("@kbn/config-schema").Type<string>;
}>;
export declare const BulkMigrateAgentsRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        agents: import("@kbn/config-schema").Type<string | string[]>;
        uri: import("@kbn/config-schema").Type<string>;
        enrollment_token: import("@kbn/config-schema").Type<string>;
        settings: import("@kbn/config-schema").Type<Readonly<{
            tags?: string[] | undefined;
            headers?: Record<string, string> | undefined;
            staging?: string | undefined;
            ca_sha256?: string | undefined;
            proxy_url?: string | undefined;
            proxy_headers?: Record<string, string> | undefined;
            certificate_authorities?: string | undefined;
            elastic_agent_cert?: string | undefined;
            elastic_agent_cert_key?: string | undefined;
            elastic_agent_cert_key_passphrase?: string | undefined;
            insecure?: boolean | undefined;
            proxy_disabled?: boolean | undefined;
        } & {}> | undefined>;
        batchSize: import("@kbn/config-schema").Type<number | undefined>;
    }>;
};
export declare const BulkMigrateAgentsResponseSchema: import("@kbn/config-schema").ObjectType<{
    actionId: import("@kbn/config-schema").Type<string>;
}>;
export declare const PostBulkUpdateAgentTagsRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        agents: import("@kbn/config-schema").Type<string | string[]>;
        tagsToAdd: import("@kbn/config-schema").Type<string[] | undefined>;
        tagsToRemove: import("@kbn/config-schema").Type<string[] | undefined>;
        batchSize: import("@kbn/config-schema").Type<number | undefined>;
        includeInactive: import("@kbn/config-schema").Type<boolean>;
    }>;
};
export declare const PostBulkActionResponseSchema: import("@kbn/config-schema").ObjectType<{
    actionId: import("@kbn/config-schema").Type<string>;
}>;
export declare const GetAgentStatusRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        policyId: import("@kbn/config-schema").Type<string | undefined>;
        policyIds: import("@kbn/config-schema").Type<string | string[] | undefined>;
        kuery: import("@kbn/config-schema").Type<string | undefined>;
    }>;
};
export declare const GetAgentStatusResponseSchema: import("@kbn/config-schema").ObjectType<{
    results: import("@kbn/config-schema").ObjectType<{
        events: import("@kbn/config-schema").Type<number>;
        online: import("@kbn/config-schema").Type<number>;
        error: import("@kbn/config-schema").Type<number>;
        offline: import("@kbn/config-schema").Type<number>;
        uninstalled: import("@kbn/config-schema").Type<number | undefined>;
        orphaned: import("@kbn/config-schema").Type<number | undefined>;
        other: import("@kbn/config-schema").Type<number>;
        updating: import("@kbn/config-schema").Type<number>;
        inactive: import("@kbn/config-schema").Type<number>;
        unenrolled: import("@kbn/config-schema").Type<number>;
        all: import("@kbn/config-schema").Type<number>;
        active: import("@kbn/config-schema").Type<number>;
    }>;
}>;
export declare const GetAgentDataRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        agentsIds: import("@kbn/config-schema").Type<string | string[]>;
        pkgName: import("@kbn/config-schema").Type<string | undefined>;
        pkgVersion: import("@kbn/config-schema").Type<string | undefined>;
        previewData: import("@kbn/config-schema").Type<boolean>;
    }>;
};
export declare const GetAgentDataResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
        data: boolean;
    }>>[]>;
    dataPreview: import("@kbn/config-schema").Type<any[]>;
}>;
export declare const GetActionStatusRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        page: import("@kbn/config-schema").Type<number>;
        perPage: import("@kbn/config-schema").Type<number>;
        date: import("@kbn/config-schema").Type<string | undefined>;
        latest: import("@kbn/config-schema").Type<number | undefined>;
        errorSize: import("@kbn/config-schema").Type<number>;
    }>;
};
export declare const GetActionStatusResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<Readonly<{
        version?: string | undefined;
        startTime?: string | undefined;
        expiration?: string | undefined;
        policyId?: string | undefined;
        revision?: number | undefined;
        is_automatic?: boolean | undefined;
        completionTime?: string | undefined;
        cancellationTime?: string | undefined;
        newPolicyId?: string | undefined;
        hasRolloutPeriod?: boolean | undefined;
        latestErrors?: Readonly<{
            hostname?: string | undefined;
        } & {
            error: string;
            timestamp: string;
            agentId: string;
        }>[] | undefined;
    } & {
        status: "COMPLETE" | "IN_PROGRESS" | "CANCELLED" | "EXPIRED" | "FAILED" | "ROLLOUT_PASSED";
        type: "SETTINGS" | "UNENROLL" | "UPGRADE" | "ROLLBACK" | "POLICY_REASSIGN" | "CANCEL" | "FORCE_UNENROLL" | "UPDATE_TAGS" | "REQUEST_DIAGNOSTICS" | "POLICY_CHANGE" | "INPUT_ACTION" | "MIGRATE" | "PRIVILEGE_LEVEL_CHANGE";
        actionId: string;
        nbAgentsActionCreated: number;
        nbAgentsAck: number;
        nbAgentsFailed: number;
        nbAgentsActioned: number;
        creationTime: string;
    }>[]>;
}>;
export declare const GetAvailableAgentVersionsResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<string[]>;
}>;
export declare const ChangeAgentPrivilegeLevelRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentId: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").Type<Readonly<{
        user_info?: Readonly<{
            password?: string | undefined;
            username?: string | undefined;
            groupname?: string | undefined;
        } & {}> | undefined;
    } & {}> | null>;
};
export declare const ChangeAgentPrivilegeLevelResponseSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    actionId: string;
}> | Readonly<{} & {
    message: string;
}>>;
export declare const BulkChangeAgentsPrivilegeLevelRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        agents: import("@kbn/config-schema").Type<string | string[]>;
        batchSize: import("@kbn/config-schema").Type<number | undefined>;
        user_info: import("@kbn/config-schema").Type<Readonly<{
            password?: string | undefined;
            username?: string | undefined;
            groupname?: string | undefined;
        } & {}> | undefined>;
    }>;
};
export declare const BulkChangeAgentsPrivilegeLevelResponseSchema: import("@kbn/config-schema").ObjectType<{
    actionId: import("@kbn/config-schema").Type<string>;
}>;
export declare const PostAgentRollbackRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        agentId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const PostAgentRollbackResponseSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    actionId: string;
}> | Readonly<{} & {
    message: string;
}>>;
export declare const PostBulkAgentRollbackRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        agents: import("@kbn/config-schema").Type<string | string[]>;
        batchSize: import("@kbn/config-schema").Type<number | undefined>;
        includeInactive: import("@kbn/config-schema").Type<boolean>;
    }>;
};
export declare const PostBulkAgentRollbackResponseSchema: import("@kbn/config-schema").ObjectType<{
    actionIds: import("@kbn/config-schema").Type<string[]>;
}>;
export declare const PostGenerateAgentsReportRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        agents: import("@kbn/config-schema").Type<string | string[]>;
        fields: import("@kbn/config-schema").Type<string[]>;
        timezone: import("@kbn/config-schema").Type<string | undefined>;
        sort: import("@kbn/config-schema").Type<Readonly<{
            direction?: "asc" | "desc" | undefined;
            field?: string | undefined;
        } & {}> | undefined>;
    }>;
};
export declare const PostGenerateAgentsReportResponseSchema: import("@kbn/config-schema").ObjectType<{
    url: import("@kbn/config-schema").Type<string>;
}>;
