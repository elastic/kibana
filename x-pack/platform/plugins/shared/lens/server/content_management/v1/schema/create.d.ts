export declare const lensCMCreateOptionsSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    overwrite: import("@kbn/config-schema").Type<boolean | undefined>;
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        type: string;
        name: string;
    }>[] | undefined>;
}>;
export declare const lensCMCreateBodySchema: import("@kbn/config-schema").ObjectType<{
    options: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string | undefined>;
        overwrite: import("@kbn/config-schema").Type<boolean | undefined>;
        references: import("@kbn/config-schema").Type<Readonly<{} & {
            id: string;
            type: string;
            name: string;
        }>[] | undefined>;
    }>;
    data: import("@kbn/config-schema").Type<Readonly<{
        state?: any;
        description?: string | undefined;
        version?: 1 | undefined;
    } & {
        title: string;
        visualizationType: string;
    }> | Readonly<{
        state?: any;
        description?: string | null | undefined;
        visualizationType?: string | null | undefined;
        visState?: string | undefined;
        uiStateJSON?: string | undefined;
        savedSearchRefName?: string | undefined;
    } & {
        title: string;
    }>>;
}>;
export declare const lensCMCreateResultSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string>;
        type: import("@kbn/config-schema").Type<string>;
        version: import("@kbn/config-schema").Type<string | undefined>;
        createdAt: import("@kbn/config-schema").Type<string | undefined>;
        updatedAt: import("@kbn/config-schema").Type<string | undefined>;
        createdBy: import("@kbn/config-schema").Type<string | undefined>;
        updatedBy: import("@kbn/config-schema").Type<string | undefined>;
        error: import("@kbn/config-schema").Type<Readonly<{} & {
            error: string;
            message: string;
            statusCode: number;
            metadata: Readonly<{} & {}>;
        }> | undefined>;
        attributes: import("@kbn/config-schema").ObjectType<{
            title: import("@kbn/config-schema").Type<string>;
            description: import("@kbn/config-schema").Type<string | undefined>;
            visualizationType: import("@kbn/config-schema").Type<string>;
            state: import("@kbn/config-schema").Type<any>;
            version: import("@kbn/config-schema").Type<1 | undefined>;
        }>;
        references: import("@kbn/config-schema").Type<Readonly<{} & {
            id: string;
            type: string;
            name: string;
        }>[]>;
        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
        originId: import("@kbn/config-schema").Type<string | undefined>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
}>;
