export declare const lensGetRequestParamsSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
}>;
export declare const lensGetResponseBodySchema: import("@kbn/config-schema").ObjectType<Omit<{
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
}, "meta"> & {
    meta: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<string>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
        updatedAt: import("@kbn/config-schema").Type<string | undefined>;
        createdAt: import("@kbn/config-schema").Type<string | undefined>;
        originId: import("@kbn/config-schema").Type<string | undefined>;
        createdBy: import("@kbn/config-schema").Type<string | undefined>;
        updatedBy: import("@kbn/config-schema").Type<string | undefined>;
        outcome: import("@kbn/config-schema").Type<"conflict" | "exactMatch" | "aliasMatch">;
        aliasTargetId: import("@kbn/config-schema").Type<string | undefined>;
        aliasPurpose: import("@kbn/config-schema").Type<"savedObjectConversion" | "savedObjectImport" | undefined>;
    }>;
}>;
