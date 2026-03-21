export declare const rawConnectorTokenSchema: import("@kbn/config-schema").ObjectType<Omit<{
    createdAt: import("@kbn/config-schema").Type<string>;
    connectorId: import("@kbn/config-schema").Type<string>;
    expiresAt: import("@kbn/config-schema").Type<string>;
    token: import("@kbn/config-schema").Type<string>;
    tokenType: import("@kbn/config-schema").Type<string>;
    updatedAt: import("@kbn/config-schema").Type<string>;
}, "refreshToken" | "expiresAt" | "refreshTokenExpiresAt"> & {
    refreshToken: import("@kbn/config-schema").Type<string | undefined>;
    expiresAt: import("@kbn/config-schema").Type<string | undefined>;
    refreshTokenExpiresAt: import("@kbn/config-schema").Type<string | undefined>;
}>;
