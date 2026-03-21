export declare enum OAuthAuthorizationStatus {
    Success = "success",
    Error = "error"
}
export declare const OAUTH_CALLBACK_QUERY_PARAMS: {
    readonly CONNECTOR_ID: "connector_id";
    readonly AUTHORIZATION_STATUS: "oauth_authorization";
    readonly ERROR: "error";
    readonly AUTO_CLOSE: "auto_close";
};
export declare const OAUTH_BROADCAST_CHANNEL_NAME = "oauth_flow_completed";
