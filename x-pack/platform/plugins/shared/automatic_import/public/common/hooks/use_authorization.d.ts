export interface Authorization {
    /** Kibana Management > Connectors: All (create/update connectors). */
    canCreateConnectors: boolean;
}
export declare const useAuthorization: () => Authorization;
