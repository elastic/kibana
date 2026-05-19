export declare const UUID_V5_NAMESPACE = "dde7c2de-1370-4c19-9975-b473d0e03508";
export declare const PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE = "fleet-preconfiguration-deletion-record";
export declare const PRECONFIGURATION_LATEST_KEYWORD = "latest";
export declare const AUTO_UPDATE_PACKAGES: {
    name: string;
    version: string;
}[];
export declare const AUTO_UPGRADE_POLICIES_PACKAGES: {
    name: string;
    version: string;
}[];
export declare const FLEET_PACKAGES: {
    name: string;
    version: string;
}[];
export declare const KEEP_POLICIES_UP_TO_DATE_PACKAGES: {
    name: string;
    version: string;
}[];
export interface PreconfigurationError {
    package?: {
        name: string;
        version: string;
    };
    agentPolicy?: {
        name: string;
    };
    error: Error;
}
