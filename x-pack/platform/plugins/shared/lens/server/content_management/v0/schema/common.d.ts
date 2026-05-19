/**
 * Pre-existing Lens SO attributes (aka `v0`).
 *
 * We could still require handling see these attributes and should allow
 * saving them as is with unknown version. The CM will eventually apply the transforms.
 *
 * @deprecated - use `v1` schemas
 */
export declare const lensItemAttributesSchemaV0: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | null | undefined>;
    visualizationType: import("@kbn/config-schema").Type<string | null | undefined>;
    state: import("@kbn/config-schema").Type<any>;
    uiStateJSON: import("@kbn/config-schema").Type<string | undefined>;
    visState: import("@kbn/config-schema").Type<string | undefined>;
    savedSearchRefName: import("@kbn/config-schema").Type<string | undefined>;
}>;
/**
 * The underlying SO type used to store Lens state in Content Management.
 *
 * Only used in lens server-side Content Management.
 *
 * @deprecated - use `v1` schemas
 */
export declare const lensSavedObjectSchemaV0: import("@kbn/config-schema").ObjectType<{
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
        description: import("@kbn/config-schema").Type<string | null | undefined>;
        visualizationType: import("@kbn/config-schema").Type<string | null | undefined>;
        state: import("@kbn/config-schema").Type<any>;
        uiStateJSON: import("@kbn/config-schema").Type<string | undefined>;
        visState: import("@kbn/config-schema").Type<string | undefined>;
        savedSearchRefName: import("@kbn/config-schema").Type<string | undefined>;
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
/**
 * The Lens item data returned from the server
 *
 * @deprecated - use `v1` schemas
 */
export declare const lensItemSchemaV0: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | null | undefined>;
    visualizationType: import("@kbn/config-schema").Type<string | null | undefined>;
    state: import("@kbn/config-schema").Type<any>;
    uiStateJSON: import("@kbn/config-schema").Type<string | undefined>;
    visState: import("@kbn/config-schema").Type<string | undefined>;
    savedSearchRefName: import("@kbn/config-schema").Type<string | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[]>;
}>;
export declare const lensItemDataSchemaV0: import("@kbn/config-schema").ObjectType<Omit<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string | null | undefined>;
    visualizationType: import("@kbn/config-schema").Type<string | null | undefined>;
    state: import("@kbn/config-schema").Type<any>;
    uiStateJSON: import("@kbn/config-schema").Type<string | undefined>;
    visState: import("@kbn/config-schema").Type<string | undefined>;
    savedSearchRefName: import("@kbn/config-schema").Type<string | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[]>;
}, "id"> & {}>;
