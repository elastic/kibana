export declare const lensCMUpdateOptionsSchema: import("@kbn/config-schema").ObjectType<{
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[] | undefined>;
}>;
export declare const lensCMUpdateBodySchema: import("@kbn/config-schema").ObjectType<{
    options: import("@kbn/config-schema").ObjectType<{
        references: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            id: string;
            type: string;
        }>[] | undefined>;
    }>;
    data: import("@kbn/config-schema").ObjectType<{
        title: import("@kbn/config-schema").Type<string>;
        description: import("@kbn/config-schema").Type<string | undefined>;
        visualizationType: import("@kbn/config-schema").Type<string>;
        state: import("@kbn/config-schema").Type<any>;
        version: import("@kbn/config-schema").Type<1 | undefined>;
    }>;
}>;
export declare const lensCMUpdateResultSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<{
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
            title: import("@kbn/config-schema").Type<string>;
            description: import("@kbn/config-schema").Type<string | undefined>;
            visualizationType: import("@kbn/config-schema").Type<string>;
            state: import("@kbn/config-schema").Type<any>;
            version: import("@kbn/config-schema").Type<1 | undefined>;
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
}>;
