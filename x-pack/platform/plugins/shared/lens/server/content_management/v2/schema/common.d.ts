export declare const lensItemAttributesSchemaV2: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    visualizationType: import("@kbn/config-schema").Type<string>;
    state: import("@kbn/config-schema").Type<any>;
    version: import("@kbn/config-schema").Type<2 | undefined>;
}>, lensSavedObjectSchemaV2: import("@kbn/config-schema").ObjectType<{
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
        version: import("@kbn/config-schema").Type<2 | undefined>;
    }>;
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[]>;
    namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
    originId: import("@kbn/config-schema").Type<string | undefined>;
    managed: import("@kbn/config-schema").Type<boolean | undefined>;
}>, lensItemSchemaV2: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    visualizationType: import("@kbn/config-schema").Type<string>;
    state: import("@kbn/config-schema").Type<any>;
    version: import("@kbn/config-schema").Type<2 | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[]>;
}>, lensCommonSavedObjectSchemaV2: import("@kbn/config-schema").ObjectType<{
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
}>, lensItemDataSchemaV2: import("@kbn/config-schema").ObjectType<Omit<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    visualizationType: import("@kbn/config-schema").Type<string>;
    state: import("@kbn/config-schema").Type<any>;
    version: import("@kbn/config-schema").Type<2 | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[]>;
}, "id"> & {}>;
