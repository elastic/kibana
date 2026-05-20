export declare const lensUpdateRequestParamsSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
}>;
export declare const lensUpdateRequestQuerySchema: import("@kbn/config-schema").ObjectType<{}>;
export declare const lensUpdateRequestBodySchema: import("@kbn/config-schema").Type<import("@kbn/lens-embeddable-utils").LensApiConfig | Readonly<{
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
}> | Readonly<{
    description?: string | undefined;
    version?: 1 | undefined;
    state?: any;
} & {
    title: string;
    references: Readonly<{} & {
        type: string;
        id: string;
        name: string;
    }>[];
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
    references: Readonly<{} & {
        type: string;
        id: string;
        name: string;
    }>[];
}>>;
export declare const lensUpdateResponseBodySchema: import("@kbn/config-schema").ObjectType<{
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
