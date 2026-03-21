/**
 * Normalizes agent IDs for telemetry to protect user privacy.
 * Built-in agents are reported with their actual ID, custom agents are reported as a stable hashed
 * label (CUSTOM-<sha256_prefix>).
 */
export declare function normalizeAgentIdForTelemetry(agentId?: string): string | undefined;
/**
 * Normalizes tool IDs for telemetry to protect user privacy.
 * Built-in tools (from AGENT_BUILDER_BUILTIN_TOOLS) are reported with their actual ID,
 * custom/user-created tools are reported as a stable hashed label (CUSTOM-<sha256_prefix>).
 */
export declare function normalizeToolIdForTelemetry(toolId: string): string;
