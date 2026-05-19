export declare const createFilterSchema: import("@kbn/config-schema").ObjectType<{
    filterId: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    items: import("@kbn/config-schema").Type<string[]>;
}>;
export declare const updateFilterSchema: import("@kbn/config-schema").ObjectType<{
    description: import("@kbn/config-schema").Type<string | undefined>;
    addItems: import("@kbn/config-schema").Type<string[] | undefined>;
    removeItems: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
export declare const filterIdSchema: import("@kbn/config-schema").ObjectType<{
    filterId: import("@kbn/config-schema").Type<string>;
}>;
