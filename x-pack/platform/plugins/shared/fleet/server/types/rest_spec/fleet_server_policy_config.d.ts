export declare const FleetServerHostBaseSchema: import("@kbn/config-schema").ObjectType<{
    name: import("@kbn/config-schema").Type<string | undefined>;
    host_urls: import("@kbn/config-schema").Type<string[] | undefined>;
    is_default: import("@kbn/config-schema").Type<boolean | undefined>;
    is_internal: import("@kbn/config-schema").Type<boolean | undefined>;
    proxy_id: import("@kbn/config-schema").Type<string | null>;
    secrets: import("@kbn/config-schema").Type<Readonly<{
        ssl?: Readonly<{
            key?: string | Readonly<{} & {
                id: string;
            }> | undefined;
            es_key?: string | Readonly<{} & {
                id: string;
            }> | undefined;
            agent_key?: string | Readonly<{} & {
                id: string;
            }> | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    ssl: import("@kbn/config-schema").Type<Readonly<{
        certificate?: string | undefined;
        key?: string | undefined;
        certificate_authorities?: string[] | undefined;
        es_key?: string | undefined;
        agent_key?: string | undefined;
        es_certificate_authorities?: string[] | undefined;
        es_certificate?: string | undefined;
        agent_certificate_authorities?: string[] | undefined;
        agent_certificate?: string | undefined;
        client_auth?: "optional" | "none" | "required" | undefined;
    } & {}> | null | undefined>;
}>;
export declare const FleetServerHostSchema: import("@kbn/config-schema").ObjectType<Omit<{
    name: import("@kbn/config-schema").Type<string | undefined>;
    host_urls: import("@kbn/config-schema").Type<string[] | undefined>;
    is_default: import("@kbn/config-schema").Type<boolean | undefined>;
    is_internal: import("@kbn/config-schema").Type<boolean | undefined>;
    proxy_id: import("@kbn/config-schema").Type<string | null>;
    secrets: import("@kbn/config-schema").Type<Readonly<{
        ssl?: Readonly<{
            key?: string | Readonly<{} & {
                id: string;
            }> | undefined;
            es_key?: string | Readonly<{} & {
                id: string;
            }> | undefined;
            agent_key?: string | Readonly<{} & {
                id: string;
            }> | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    ssl: import("@kbn/config-schema").Type<Readonly<{
        certificate?: string | undefined;
        key?: string | undefined;
        certificate_authorities?: string[] | undefined;
        es_key?: string | undefined;
        agent_key?: string | undefined;
        es_certificate_authorities?: string[] | undefined;
        es_certificate?: string | undefined;
        agent_certificate_authorities?: string[] | undefined;
        agent_certificate?: string | undefined;
        client_auth?: "optional" | "none" | "required" | undefined;
    } & {}> | null | undefined>;
}, "name" | "id" | "is_preconfigured" | "is_default" | "is_internal" | "proxy_id" | "host_urls"> & {
    name: import("@kbn/config-schema").Type<string>;
    id: import("@kbn/config-schema").Type<string>;
    is_preconfigured: import("@kbn/config-schema").Type<boolean>;
    is_default: import("@kbn/config-schema").Type<boolean>;
    is_internal: import("@kbn/config-schema").Type<boolean | undefined>;
    proxy_id: import("@kbn/config-schema").Type<string | null | undefined>;
    host_urls: import("@kbn/config-schema").Type<string[]>;
}>;
export declare const FleetServerHostResponseSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<Omit<{
        name: import("@kbn/config-schema").Type<string | undefined>;
        host_urls: import("@kbn/config-schema").Type<string[] | undefined>;
        is_default: import("@kbn/config-schema").Type<boolean | undefined>;
        is_internal: import("@kbn/config-schema").Type<boolean | undefined>;
        proxy_id: import("@kbn/config-schema").Type<string | null>;
        secrets: import("@kbn/config-schema").Type<Readonly<{
            ssl?: Readonly<{
                key?: string | Readonly<{} & {
                    id: string;
                }> | undefined;
                es_key?: string | Readonly<{} & {
                    id: string;
                }> | undefined;
                agent_key?: string | Readonly<{} & {
                    id: string;
                }> | undefined;
            } & {}> | undefined;
        } & {}> | undefined>;
        ssl: import("@kbn/config-schema").Type<Readonly<{
            certificate?: string | undefined;
            key?: string | undefined;
            certificate_authorities?: string[] | undefined;
            es_key?: string | undefined;
            agent_key?: string | undefined;
            es_certificate_authorities?: string[] | undefined;
            es_certificate?: string | undefined;
            agent_certificate_authorities?: string[] | undefined;
            agent_certificate?: string | undefined;
            client_auth?: "optional" | "none" | "required" | undefined;
        } & {}> | null | undefined>;
    }, "name" | "id" | "is_preconfigured" | "is_default" | "is_internal" | "proxy_id" | "host_urls"> & {
        name: import("@kbn/config-schema").Type<string>;
        id: import("@kbn/config-schema").Type<string>;
        is_preconfigured: import("@kbn/config-schema").Type<boolean>;
        is_default: import("@kbn/config-schema").Type<boolean>;
        is_internal: import("@kbn/config-schema").Type<boolean | undefined>;
        proxy_id: import("@kbn/config-schema").Type<string | null | undefined>;
        host_urls: import("@kbn/config-schema").Type<string[]>;
    }>;
}>;
export declare const PostFleetServerHostRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<Omit<Omit<{
        name: import("@kbn/config-schema").Type<string | undefined>;
        host_urls: import("@kbn/config-schema").Type<string[] | undefined>;
        is_default: import("@kbn/config-schema").Type<boolean | undefined>;
        is_internal: import("@kbn/config-schema").Type<boolean | undefined>;
        proxy_id: import("@kbn/config-schema").Type<string | null>;
        secrets: import("@kbn/config-schema").Type<Readonly<{
            ssl?: Readonly<{
                key?: string | Readonly<{} & {
                    id: string;
                }> | undefined;
                es_key?: string | Readonly<{} & {
                    id: string;
                }> | undefined;
                agent_key?: string | Readonly<{} & {
                    id: string;
                }> | undefined;
            } & {}> | undefined;
        } & {}> | undefined>;
        ssl: import("@kbn/config-schema").Type<Readonly<{
            certificate?: string | undefined;
            key?: string | undefined;
            certificate_authorities?: string[] | undefined;
            es_key?: string | undefined;
            agent_key?: string | undefined;
            es_certificate_authorities?: string[] | undefined;
            es_certificate?: string | undefined;
            agent_certificate_authorities?: string[] | undefined;
            agent_certificate?: string | undefined;
            client_auth?: "optional" | "none" | "required" | undefined;
        } & {}> | null | undefined>;
    }, "name" | "id" | "is_preconfigured" | "is_default" | "is_internal" | "proxy_id" | "host_urls"> & {
        name: import("@kbn/config-schema").Type<string>;
        id: import("@kbn/config-schema").Type<string>;
        is_preconfigured: import("@kbn/config-schema").Type<boolean>;
        is_default: import("@kbn/config-schema").Type<boolean>;
        is_internal: import("@kbn/config-schema").Type<boolean | undefined>;
        proxy_id: import("@kbn/config-schema").Type<string | null | undefined>;
        host_urls: import("@kbn/config-schema").Type<string[]>;
    }, "id"> & {
        id: import("@kbn/config-schema").Type<string | undefined>;
    }>;
};
export declare const GetOneFleetServerHostRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        itemId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const PutFleetServerHostRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        itemId: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").ObjectType<{
        name: import("@kbn/config-schema").Type<string | undefined>;
        host_urls: import("@kbn/config-schema").Type<string[] | undefined>;
        is_default: import("@kbn/config-schema").Type<boolean | undefined>;
        is_internal: import("@kbn/config-schema").Type<boolean | undefined>;
        proxy_id: import("@kbn/config-schema").Type<string | null>;
        secrets: import("@kbn/config-schema").Type<Readonly<{
            ssl?: Readonly<{
                key?: string | Readonly<{} & {
                    id: string;
                }> | undefined;
                es_key?: string | Readonly<{} & {
                    id: string;
                }> | undefined;
                agent_key?: string | Readonly<{} & {
                    id: string;
                }> | undefined;
            } & {}> | undefined;
        } & {}> | undefined>;
        ssl: import("@kbn/config-schema").Type<Readonly<{
            certificate?: string | undefined;
            key?: string | undefined;
            certificate_authorities?: string[] | undefined;
            es_key?: string | undefined;
            agent_key?: string | undefined;
            es_certificate_authorities?: string[] | undefined;
            es_certificate?: string | undefined;
            agent_certificate_authorities?: string[] | undefined;
            agent_certificate?: string | undefined;
            client_auth?: "optional" | "none" | "required" | undefined;
        } & {}> | null | undefined>;
    }>;
};
export declare const GetAllFleetServerHostRequestSchema: {};
