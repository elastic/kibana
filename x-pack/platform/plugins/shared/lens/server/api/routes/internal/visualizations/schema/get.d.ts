export declare const lensGetRequestParamsSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
}>;
export declare const lensGetResponseBodySchema: import("@kbn/config-schema").ObjectType<Omit<{
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
}, "meta"> & {
    meta: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<string>;
        originId: import("@kbn/config-schema").Type<string | undefined>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
        createdBy: import("@kbn/config-schema").Type<string | undefined>;
        updatedAt: import("@kbn/config-schema").Type<string | undefined>;
        createdAt: import("@kbn/config-schema").Type<string | undefined>;
        updatedBy: import("@kbn/config-schema").Type<string | undefined>;
        outcome: import("@kbn/config-schema").Type<"conflict" | "exactMatch" | "aliasMatch">;
        aliasTargetId: import("@kbn/config-schema").Type<string | undefined>;
        aliasPurpose: import("@kbn/config-schema").Type<"savedObjectConversion" | "savedObjectImport" | undefined>;
    }>;
}>;
