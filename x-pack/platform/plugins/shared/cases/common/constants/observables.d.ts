export declare const OBSERVABLE_TYPE_IPV4: {
    readonly label: "IPv4";
    readonly key: "observable-type-ipv4";
};
export declare const OBSERVABLE_TYPE_IPV6: {
    readonly label: "IPv6";
    readonly key: "observable-type-ipv6";
};
export declare const OBSERVABLE_TYPE_URL: {
    readonly label: "URL";
    readonly key: "observable-type-url";
};
export declare const OBSERVABLE_TYPE_HOSTNAME: {
    readonly label: "Host name";
    readonly key: "observable-type-hostname";
};
export declare const OBSERVABLE_TYPE_FILE_HASH: {
    readonly label: "File hash";
    readonly key: "observable-type-file-hash";
};
export declare const OBSERVABLE_TYPE_FILE_PATH: {
    readonly label: "File path";
    readonly key: "observable-type-file-path";
};
export declare const OBSERVABLE_TYPE_EMAIL: {
    readonly label: "Email";
    readonly key: "observable-type-email";
};
export declare const OBSERVABLE_TYPE_DOMAIN: {
    readonly label: "Domain";
    readonly key: "observable-type-domain";
};
export declare const OBSERVABLE_TYPE_AGENT_ID: {
    readonly label: "Agent id";
    readonly key: "observable-type-agent-id";
};
/**
 * Exporting an array of built-in observable types for use in the application
 */
export declare const OBSERVABLE_TYPES_BUILTIN: {
    label: string;
    key: string;
}[];
export declare const OBSERVABLE_TYPES_BUILTIN_KEYS: string[];
/**
 * Locale-independent marker stored as the description of observables that were
 * automatically extracted from alert/event ECS fields during attachment creation.
 * Used by the telemetry aggregation to distinguish auto-extracted from manually
 * added observables.
 *
 * NOTE: Because this string is stored in the observable's user-visible `description`
 * field and matched at telemetry time, this categorisation is still locale-fragile on
 * non-English deployments. A dedicated, locale-independent `source` field on the
 * observable type would be the robust solution; that is tracked as a follow-up.
 */
export declare const AUTO_EXTRACT_OBSERVABLE_DESCRIPTION = "Auto extracted observable";
