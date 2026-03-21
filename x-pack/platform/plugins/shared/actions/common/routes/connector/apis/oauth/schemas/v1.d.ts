export declare const startOAuthFlowRequestBodySchema: import("@kbn/config-schema").ObjectType<{
    returnUrl: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const startOAuthFlowPathParamsSchema: import("@kbn/config-schema").ObjectType<{
    connectorId: import("@kbn/config-schema").Type<string>;
}>;
export declare const disconnectOAuthPathParamsSchema: import("@kbn/config-schema").ObjectType<{
    connectorId: import("@kbn/config-schema").Type<string>;
}>;
