export declare const AgentTypeSchema: import("@kbn/config-schema").Type<"PERMANENT" | "EPHEMERAL" | "TEMPORARY">;
export declare const NewAgentActionSchema: import("@kbn/config-schema").Type<Readonly<{
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
