import type { Type } from '@kbn/config-schema';
export declare const clientLogoSchema: import("@kbn/config-schema").ObjectType<{
    media_type: Type<"image/jpeg" | "image/png" | "image/gif">;
    data: Type<string>;
}>;
export declare const clientTypeSchema: Type<"public" | "confidential">;
export declare const redirectUrisSchema: Type<string[]>;
export declare const clientMetadataSchema: Type<Record<string, string>>;
export declare const nullableClientMetadataSchema: Type<Record<string, string | null>>;
export declare const createClientBodySchema: import("@kbn/config-schema").ObjectType<{
    client_name: Type<string>;
    client_type: Type<"public" | "confidential" | undefined>;
    client_metadata: Type<Record<string, string> | undefined>;
    client_logo: Type<Readonly<{} & {
        data: string;
        media_type: "image/jpeg" | "image/png" | "image/gif";
    }> | undefined>;
    redirect_uris: Type<string[] | undefined>;
}>;
export declare const updateClientBodySchema: import("@kbn/config-schema").ObjectType<{
    client_name: Type<string | null | undefined>;
    client_metadata: Type<Record<string, string | null> | undefined>;
    client_logo: Type<Readonly<{} & {
        data: string;
        media_type: "image/jpeg" | "image/png" | "image/gif";
    }> | null | undefined>;
    redirect_uris: Type<string[] | undefined>;
}>;
export declare const updateConnectionBodySchema: import("@kbn/config-schema").ObjectType<{
    name: Type<string>;
}>;
