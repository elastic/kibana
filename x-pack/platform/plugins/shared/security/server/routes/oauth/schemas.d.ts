export declare const OAUTH_MAX_STRING_FIELD_LENGTH = 1024;
export declare const OAUTH_MAX_URI_LENGTH = 2048;
export declare const clientLogoSchema: import("@kbn/config-schema").ObjectType<{
    media_type: import("@kbn/config-schema").Type<"image/png" | "image/jpeg" | "image/gif">;
    data: import("@kbn/config-schema").Type<string>;
}>;
export declare const clientTypeSchema: import("@kbn/config-schema").Type<"public" | "confidential">;
export declare const redirectUrisSchema: import("@kbn/config-schema").Type<string[]>;
export declare const clientMetadataSchema: import("@kbn/config-schema").Type<Record<string, string>>;
export declare const nullableClientMetadataSchema: import("@kbn/config-schema").Type<Record<string, string | null>>;
export declare const createClientBodySchema: import("@kbn/config-schema").ObjectType<{
    resource: import("@kbn/config-schema").Type<string>;
    client_name: import("@kbn/config-schema").Type<string>;
    client_type: import("@kbn/config-schema").Type<"public" | "confidential" | undefined>;
    client_metadata: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
    client_logo: import("@kbn/config-schema").Type<Readonly<{} & {
        data: string;
        media_type: "image/png" | "image/jpeg" | "image/gif";
    }> | undefined>;
    redirect_uris: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
export declare const updateClientBodySchema: import("@kbn/config-schema").ObjectType<{
    client_name: import("@kbn/config-schema").Type<string | null | undefined>;
    client_metadata: import("@kbn/config-schema").Type<Record<string, string | null> | undefined>;
    client_logo: import("@kbn/config-schema").Type<Readonly<{} & {
        data: string;
        media_type: "image/png" | "image/jpeg" | "image/gif";
    }> | null | undefined>;
    redirect_uris: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
export declare const updateConnectionBodySchema: import("@kbn/config-schema").ObjectType<{
    name: import("@kbn/config-schema").Type<string>;
}>;
