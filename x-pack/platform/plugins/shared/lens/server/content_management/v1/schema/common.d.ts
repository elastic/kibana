export declare const lensItemAttributesSchemaV1: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    visualizationType: import("@kbn/config-schema").Type<string>;
    state: import("@kbn/config-schema").Type<any>;
    version: import("@kbn/config-schema").Type<1 | undefined>;
}>, lensSavedObjectSchemaV1: import("@kbn/config-schema").ObjectType<{
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
        version: import("@kbn/config-schema").Type<1 | undefined>;
    }>;
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        type: string;
        id: string;
        name: string;
    }>[]>;
    namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
    originId: import("@kbn/config-schema").Type<string | undefined>;
    managed: import("@kbn/config-schema").Type<boolean | undefined>;
}>, lensItemSchemaV1: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    visualizationType: import("@kbn/config-schema").Type<string>;
    state: import("@kbn/config-schema").Type<any>;
    version: import("@kbn/config-schema").Type<1 | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        type: string;
        id: string;
        name: string;
    }>[]>;
}>, lensCommonSavedObjectSchemaV1: import("@kbn/config-schema").ObjectType<{
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
    }>;
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        type: string;
        id: string;
        name: string;
    }>[]>;
    namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
    originId: import("@kbn/config-schema").Type<string | undefined>;
    managed: import("@kbn/config-schema").Type<boolean | undefined>;
}>, lensItemDataSchemaV1: import("@kbn/config-schema").ObjectType<Omit<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    visualizationType: import("@kbn/config-schema").Type<string>;
    state: import("@kbn/config-schema").Type<any>;
    version: import("@kbn/config-schema").Type<1 | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        type: string;
        id: string;
        name: string;
    }>[]>;
}, "id"> & {}>;
