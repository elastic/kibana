export declare const GetTagsRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        kuery: import("@kbn/config-schema").Type<string | undefined>;
        showInactive: import("@kbn/config-schema").Type<boolean>;
    }>;
};
export declare const GetTagsResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<string[]>;
}>;
