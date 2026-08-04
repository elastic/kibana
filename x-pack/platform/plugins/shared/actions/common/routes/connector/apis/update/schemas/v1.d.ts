export declare const updateConnectorParamsSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
}>;
export declare const updateConnectorBodySchema: import("@kbn/config-schema").ObjectType<{
    name: import("@kbn/config-schema").Type<string>;
    config: import("@kbn/config-schema").Type<Record<string, any>>;
    secrets: import("@kbn/config-schema").Type<Record<string, any>>;
}>;
