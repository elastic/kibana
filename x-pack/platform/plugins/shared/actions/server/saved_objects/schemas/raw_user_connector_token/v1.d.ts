export declare const rawUserConnectorTokenSchema: import("@kbn/config-schema").ObjectType<{
    profileUid: import("@kbn/config-schema").Type<string>;
    connectorId: import("@kbn/config-schema").Type<string>;
    credentialType: import("@kbn/config-schema").Type<string>;
    credentials: import("@kbn/config-schema").Type<string>;
    expiresAt: import("@kbn/config-schema").Type<string | undefined>;
    refreshTokenExpiresAt: import("@kbn/config-schema").Type<string | undefined>;
    createdAt: import("@kbn/config-schema").Type<string>;
    updatedAt: import("@kbn/config-schema").Type<string>;
}>;
