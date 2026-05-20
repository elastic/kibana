export declare const PLUGIN_ID = "anonymization";
export declare const PLUGIN_NAME = "Anonymization";
/** Internal API version for all anonymization routes. */
export declare const ANONYMIZATION_API_VERSION = "1";
/** Base path for all anonymization profile APIs. */
export declare const ANONYMIZATION_PROFILES_API_BASE = "/internal/anonymization/profiles";
/**
 * System index name for anonymization profiles.
 * Uses `.kibana-` prefix so that `kibana_system` role has access.
 */
export declare const ANONYMIZATION_PROFILES_INDEX = ".kibana-anonymization-profiles";
/** Feature ID for Kibana feature privileges. */
export declare const ANONYMIZATION_FEATURE_ID = "anonymization";
/** API privilege tags used in feature registration and route authz. */
export declare const apiPrivileges: {
    readonly readAnonymization: "read_anonymization";
    readonly manageAnonymization: "manage_anonymization";
};
/** UI capability keys granted by feature privileges. */
export declare const uiPrivileges: {
    readonly show: "show";
    readonly manage: "manage";
};
/** Extracts a human-readable error message from an unknown error. */
export declare const toErrorMessage: (err: unknown) => string;
/** Extracts an HTTP status code from an unknown error (Kibana SO or ES client shapes). */
export declare const toStatusCode: (err: unknown) => number;
