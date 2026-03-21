export declare const rawOAuthStateSchema: import("@kbn/config-schema").ObjectType<{
    state: import("@kbn/config-schema").Type<string>;
    codeVerifier: import("@kbn/config-schema").Type<string>;
    connectorId: import("@kbn/config-schema").Type<string>;
    scope: import("@kbn/config-schema").Type<string | undefined>;
    kibanaReturnUrl: import("@kbn/config-schema").Type<string | undefined>;
    spaceId: import("@kbn/config-schema").Type<string>;
    createdAt: import("@kbn/config-schema").Type<string>;
    expiresAt: import("@kbn/config-schema").Type<string>;
    createdBy: import("@kbn/config-schema").Type<string | undefined>;
}>;
