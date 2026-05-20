/**
 * The Lens item meta returned from the server
 */
export declare const lensItemMetaSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<string>;
    managed: import("@kbn/config-schema").Type<boolean | undefined>;
    updatedAt: import("@kbn/config-schema").Type<string | undefined>;
    createdAt: import("@kbn/config-schema").Type<string | undefined>;
    originId: import("@kbn/config-schema").Type<string | undefined>;
    createdBy: import("@kbn/config-schema").Type<string | undefined>;
    updatedBy: import("@kbn/config-schema").Type<string | undefined>;
}>;
/**
 * The Lens response item returned from the server
 */
export declare const lensResponseItemSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    data: import("@kbn/config-schema").Type<import("@kbn/lens-embeddable-utils").LensApiConfig | Readonly<{
        description?: string | undefined;
        version?: 2 | undefined;
        state?: any;
    } & {
        title: string;
        references: Readonly<{} & {
            type: string;
            id: string;
            name: string;
        }>[];
        visualizationType: string;
    }>>;
    meta: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<string>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
        updatedAt: import("@kbn/config-schema").Type<string | undefined>;
        createdAt: import("@kbn/config-schema").Type<string | undefined>;
        originId: import("@kbn/config-schema").Type<string | undefined>;
        createdBy: import("@kbn/config-schema").Type<string | undefined>;
        updatedBy: import("@kbn/config-schema").Type<string | undefined>;
    }>;
}>;
