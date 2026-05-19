/**
 * Builds the Lens schema set for a given item version so callers can opt into
 * different version literals without duplicating schema definitions.
 */
export declare function createVersionedLensSchemas<Version extends number>(version: Version): {
    readonly lensItemAttributesSchema: import("@kbn/config-schema").ObjectType<{
        title: import("@kbn/config-schema").Type<string>;
        description: import("@kbn/config-schema").Type<string | undefined>;
        visualizationType: import("@kbn/config-schema").Type<string>;
        state: import("@kbn/config-schema").Type<any>;
        version: import("@kbn/config-schema").Type<Version | undefined>;
    }>;
    readonly lensSavedObjectSchema: import("@kbn/config-schema").ObjectType<{
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
            version: import("@kbn/config-schema").Type<Version | undefined>;
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
    readonly lensItemSchema: import("@kbn/config-schema").ObjectType<{
        title: import("@kbn/config-schema").Type<string>;
        description: import("@kbn/config-schema").Type<string | undefined>;
        visualizationType: import("@kbn/config-schema").Type<string>;
        state: import("@kbn/config-schema").Type<any>;
        version: import("@kbn/config-schema").Type<Version | undefined>;
        id: import("@kbn/config-schema").Type<string>;
        references: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            id: string;
            type: string;
        }>[]>;
    }>;
    readonly lensCommonSavedObjectSchema: import("@kbn/config-schema").ObjectType<{
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
    readonly lensItemDataSchema: import("@kbn/config-schema").ObjectType<Omit<{
        title: import("@kbn/config-schema").Type<string>;
        description: import("@kbn/config-schema").Type<string | undefined>;
        visualizationType: import("@kbn/config-schema").Type<string>;
        state: import("@kbn/config-schema").Type<any>;
        version: import("@kbn/config-schema").Type<Version | undefined>;
        id: import("@kbn/config-schema").Type<string>;
        references: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            id: string;
            type: string;
        }>[]>;
    }, "id"> & {}>;
};
