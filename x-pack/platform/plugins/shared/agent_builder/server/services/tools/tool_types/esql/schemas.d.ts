export declare const paramValueTypeSchema: import("@kbn/config-schema").Type<"string" | "boolean" | "date" | "float" | "array" | "integer">;
export declare const paramSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"string" | "boolean" | "date" | "float" | "array" | "integer">;
    description: import("@kbn/config-schema").Type<string>;
    optional: import("@kbn/config-schema").Type<boolean | undefined>;
    defaultValue: import("@kbn/config-schema").ConditionalType<true, string | number | boolean | (string | number)[] | undefined, never>;
}>;
export declare const configurationSchema: import("@kbn/config-schema").ObjectType<{
    query: import("@kbn/config-schema").Type<string>;
    params: import("@kbn/config-schema").Type<Record<string, Readonly<{
        optional?: boolean | undefined;
        defaultValue?: string | number | boolean | (string | number)[] | undefined;
    } & {
        description: string;
        type: "string" | "boolean" | "date" | "float" | "array" | "integer";
    }>>>;
}>;
export declare const configurationUpdateSchema: import("@kbn/config-schema").ObjectType<{
    query: import("@kbn/config-schema").Type<string | undefined>;
    params: import("@kbn/config-schema").Type<Record<string, Readonly<{
        optional?: boolean | undefined;
        defaultValue?: string | number | boolean | (string | number)[] | undefined;
    } & {
        description: string;
        type: "string" | "boolean" | "date" | "float" | "array" | "integer";
    }>> | undefined>;
}>;
