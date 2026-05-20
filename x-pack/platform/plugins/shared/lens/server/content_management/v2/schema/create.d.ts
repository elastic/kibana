export declare const lensCMCreateOptionsSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        type: string;
        id: string;
        name: string;
    }>[] | undefined>;
    overwrite: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const lensCMCreateBodySchema: import("@kbn/config-schema").ObjectType<{
    options: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string | undefined>;
        references: import("@kbn/config-schema").Type<Readonly<{} & {
            type: string;
            id: string;
            name: string;
        }>[] | undefined>;
        overwrite: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
    data: import("@kbn/config-schema").Type<Readonly<{
        description?: string | undefined;
        version?: 1 | undefined;
        state?: any;
    } & {
        title: string;
        visualizationType: string;
    }> | Readonly<{
        description?: string | null | undefined;
        state?: any;
        visState?: string | undefined;
        uiStateJSON?: string | undefined;
        visualizationType?: string | null | undefined;
        savedSearchRefName?: string | undefined;
    } & {
        title: string;
    }> | Readonly<{
        description?: string | undefined;
        version?: 2 | undefined;
        state?: any;
    } & {
        title: string;
        visualizationType: string;
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
            metadata: Readonly<{} & {}>;
            statusCode: number;
        }> | undefined>;
        attributes: import("@kbn/config-schema").ObjectType<{
            title: import("@kbn/config-schema").Type<string>;
            description: import("@kbn/config-schema").Type<string | undefined>;
            visualizationType: import("@kbn/config-schema").Type<string>;
            state: import("@kbn/config-schema").Type<any>;
            version: import("@kbn/config-schema").Type<2 | undefined>;
        }>;
        references: import("@kbn/config-schema").Type<Readonly<{} & {
            type: string;
            id: string;
            name: string;
        }>[]>;
        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
        originId: import("@kbn/config-schema").Type<string | undefined>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
}>;
