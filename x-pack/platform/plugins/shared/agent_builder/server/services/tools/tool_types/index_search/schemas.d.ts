export declare const configurationSchema: import("@kbn/config-schema").ObjectType<{
    pattern: import("@kbn/config-schema").Type<string>;
    row_limit: import("@kbn/config-schema").Type<number | undefined>;
    custom_instructions: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const configurationUpdateSchema: import("@kbn/config-schema").ObjectType<{
    pattern: import("@kbn/config-schema").Type<string | undefined>;
    row_limit: import("@kbn/config-schema").Type<number | undefined>;
    custom_instructions: import("@kbn/config-schema").Type<string | undefined>;
}>;
