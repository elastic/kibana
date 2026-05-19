/**
 * The Lens item meta returned from the server
 */
export declare const lensItemMetaSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<string>;
    originId: import("@kbn/config-schema").Type<string | undefined>;
    managed: import("@kbn/config-schema").Type<boolean | undefined>;
    createdBy: import("@kbn/config-schema").Type<string | undefined>;
    updatedAt: import("@kbn/config-schema").Type<string | undefined>;
    createdAt: import("@kbn/config-schema").Type<string | undefined>;
    updatedBy: import("@kbn/config-schema").Type<string | undefined>;
}>;
/**
 * The Lens response item returned from the server
 */
export declare const lensResponseItemSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    data: import("@kbn/config-schema").Type<import("@kbn/lens-embeddable-utils").LensApiConfig | Readonly<{
        state?: any;
        version?: 2 | undefined;
        description?: string | undefined;
    } & {
        title: string;
        references: Readonly<{} & {
            name: string;
            id: string;
            type: string;
        }>[];
        visualizationType: string;
    }>>;
    meta: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<string>;
        originId: import("@kbn/config-schema").Type<string | undefined>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
        createdBy: import("@kbn/config-schema").Type<string | undefined>;
        updatedAt: import("@kbn/config-schema").Type<string | undefined>;
        createdAt: import("@kbn/config-schema").Type<string | undefined>;
        updatedBy: import("@kbn/config-schema").Type<string | undefined>;
    }>;
}>;
