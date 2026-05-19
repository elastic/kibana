export declare const lensCMMSearchResultSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    type: import("@kbn/config-schema").Type<string>;
    version: import("@kbn/config-schema").Type<string | undefined>;
    createdAt: import("@kbn/config-schema").Type<string | undefined>;
    updatedAt: import("@kbn/config-schema").Type<string | undefined>;
    createdBy: import("@kbn/config-schema").Type<string | undefined>;
    updatedBy: import("@kbn/config-schema").Type<string | undefined>;
    error: import("@kbn/config-schema").Type<Readonly<{} & {
        metadata: Readonly<{} & {}>;
        error: string;
        message: string;
        statusCode: number;
    }> | undefined>;
    attributes: import("@kbn/config-schema").ObjectType<{
        description: import("@kbn/config-schema").Type<string | undefined>;
        title: import("@kbn/config-schema").Type<string>;
    }>;
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[]>;
    namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
    originId: import("@kbn/config-schema").Type<string | undefined>;
    managed: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
