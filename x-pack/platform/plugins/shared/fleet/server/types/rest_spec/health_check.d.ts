export declare const PostHealthCheckRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const PostHealthCheckResponseSchema: import("@kbn/config-schema").ObjectType<{
    status: import("@kbn/config-schema").Type<string>;
    name: import("@kbn/config-schema").Type<string | undefined>;
    host_id: import("@kbn/config-schema").Type<string | undefined>;
}>;
