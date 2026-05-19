export declare const ProxyHeadersSchema: import("@kbn/config-schema").Type<Record<string, string | number | boolean> | null>;
export declare const FleetProxySchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    url: import("@kbn/config-schema").Type<string>;
    name: import("@kbn/config-schema").Type<string>;
    proxy_headers: import("@kbn/config-schema").Type<Record<string, string | number | boolean> | null | undefined>;
    certificate_authorities: import("@kbn/config-schema").Type<string | null | undefined>;
    certificate: import("@kbn/config-schema").Type<string | null | undefined>;
    certificate_key: import("@kbn/config-schema").Type<string | null | undefined>;
    is_preconfigured: import("@kbn/config-schema").Type<boolean>;
}>;
export declare const PostFleetProxyRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<Omit<{
        id: import("@kbn/config-schema").Type<string>;
        url: import("@kbn/config-schema").Type<string>;
        name: import("@kbn/config-schema").Type<string>;
        proxy_headers: import("@kbn/config-schema").Type<Record<string, string | number | boolean> | null | undefined>;
        certificate_authorities: import("@kbn/config-schema").Type<string | null | undefined>;
        certificate: import("@kbn/config-schema").Type<string | null | undefined>;
        certificate_key: import("@kbn/config-schema").Type<string | null | undefined>;
        is_preconfigured: import("@kbn/config-schema").Type<boolean>;
    }, "id"> & {
        id: import("@kbn/config-schema").Type<string | undefined>;
    }>;
};
export declare const FleetProxyResponseSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string>;
        url: import("@kbn/config-schema").Type<string>;
        name: import("@kbn/config-schema").Type<string>;
        proxy_headers: import("@kbn/config-schema").Type<Record<string, string | number | boolean> | null | undefined>;
        certificate_authorities: import("@kbn/config-schema").Type<string | null | undefined>;
        certificate: import("@kbn/config-schema").Type<string | null | undefined>;
        certificate_key: import("@kbn/config-schema").Type<string | null | undefined>;
        is_preconfigured: import("@kbn/config-schema").Type<boolean>;
    }>;
}>;
export declare const PutFleetProxyRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        itemId: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").ObjectType<{
        name: import("@kbn/config-schema").Type<string | undefined>;
        url: import("@kbn/config-schema").Type<string | undefined>;
        proxy_headers: import("@kbn/config-schema").Type<Record<string, string | number | boolean> | null | undefined>;
        certificate_authorities: import("@kbn/config-schema").Type<string | null>;
        certificate: import("@kbn/config-schema").Type<string | null>;
        certificate_key: import("@kbn/config-schema").Type<string | null>;
    }>;
};
export declare const GetOneFleetProxyRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        itemId: import("@kbn/config-schema").Type<string>;
    }>;
};
