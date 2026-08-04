export declare const createConnectorRequestParamsSchema: import("@kbn/config-schema").Type<Readonly<{
    id?: string | undefined;
} & {}> | undefined>;
export declare const createConnectorRequestBodySchema: import("@kbn/config-schema").ObjectType<{
    name: import("@kbn/config-schema").Type<string>;
    connector_type_id: import("@kbn/config-schema").Type<string>;
    config: import("@kbn/config-schema").Type<Record<string, any>>;
    secrets: import("@kbn/config-schema").Type<Record<string, any>>;
}>;
