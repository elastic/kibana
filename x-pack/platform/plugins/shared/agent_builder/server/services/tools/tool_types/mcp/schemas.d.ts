export declare const configurationSchema: import("@kbn/config-schema").ObjectType<{
    connector_id: import("@kbn/config-schema").Type<string>;
    tool_name: import("@kbn/config-schema").Type<string>;
}>;
export declare const configurationUpdateSchema: import("@kbn/config-schema").ObjectType<{
    connector_id: import("@kbn/config-schema").Type<string | undefined>;
    tool_name: import("@kbn/config-schema").Type<string | undefined>;
}>;
