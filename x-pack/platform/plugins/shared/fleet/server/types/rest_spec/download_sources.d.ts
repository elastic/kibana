export declare const GetOneDownloadSourcesRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        sourceId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const getDownloadSourcesRequestSchema: {};
export declare const PostDownloadSourcesRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string | undefined>;
        name: import("@kbn/config-schema").Type<string>;
        host: import("@kbn/config-schema").Type<string>;
        is_default: import("@kbn/config-schema").Type<boolean>;
        proxy_id: import("@kbn/config-schema").Type<string | null | undefined>;
        ssl: import("@kbn/config-schema").Type<Readonly<{
            certificate?: string | undefined;
            key?: string | undefined;
            certificate_authorities?: string[] | undefined;
        } & {}> | undefined>;
        auth: import("@kbn/config-schema").Type<Readonly<{
            headers?: Readonly<{} & {
                key: string;
                value: string;
            }>[] | undefined;
            api_key?: string | undefined;
            password?: string | undefined;
            username?: string | undefined;
        } & {}> | null | undefined>;
        secrets: import("@kbn/config-schema").Type<Readonly<{
            auth?: Readonly<{
                api_key?: string | Readonly<{} & {
                    id: string;
                }> | undefined;
                password?: string | Readonly<{} & {
                    id: string;
                }> | undefined;
            } & {}> | undefined;
            ssl?: Readonly<{
                key?: string | Readonly<{} & {
                    id: string;
                }> | undefined;
            } & {}> | undefined;
        } & {}> | undefined>;
    }>;
};
export declare const PutDownloadSourcesRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        sourceId: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string | undefined>;
        name: import("@kbn/config-schema").Type<string>;
        host: import("@kbn/config-schema").Type<string>;
        is_default: import("@kbn/config-schema").Type<boolean>;
        proxy_id: import("@kbn/config-schema").Type<string | null | undefined>;
        ssl: import("@kbn/config-schema").Type<Readonly<{
            certificate?: string | undefined;
            key?: string | undefined;
            certificate_authorities?: string[] | undefined;
        } & {}> | undefined>;
        auth: import("@kbn/config-schema").Type<Readonly<{
            headers?: Readonly<{} & {
                key: string;
                value: string;
            }>[] | undefined;
            api_key?: string | undefined;
            password?: string | undefined;
            username?: string | undefined;
        } & {}> | null | undefined>;
        secrets: import("@kbn/config-schema").Type<Readonly<{
            auth?: Readonly<{
                api_key?: string | Readonly<{} & {
                    id: string;
                }> | undefined;
                password?: string | Readonly<{} & {
                    id: string;
                }> | undefined;
            } & {}> | undefined;
            ssl?: Readonly<{
                key?: string | Readonly<{} & {
                    id: string;
                }> | undefined;
            } & {}> | undefined;
        } & {}> | undefined>;
    }>;
};
export declare const DeleteDownloadSourcesRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        sourceId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const DeleteDownloadSourcesResponseSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
}>;
