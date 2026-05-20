export declare const FetchIndexRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        index: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const FetchSavedObjectsRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<string>;
        name: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const FetchSavedObjectNamesRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<string>;
    }>;
};
