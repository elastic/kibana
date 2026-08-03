export declare const lensCreateRequestBodySchema: import("@kbn/config-schema").Type<import("@kbn/lens-embeddable-utils").LensApiConfig | Readonly<{
    state?: any;
    description?: string | undefined;
    version?: 2 | undefined;
} & {
    title: string;
    references: Readonly<{
        id: string;
        type: string;
        name: string;
    }>[];
    visualizationType: string;
}> | Readonly<{
    state?: any;
    description?: string | undefined;
    version?: 1 | undefined;
} & {
    title: string;
    references: Readonly<{
        id: string;
        type: string;
        name: string;
    }>[];
    visualizationType: string;
}> | Readonly<{
    state?: any;
    description?: string | null | undefined;
    visualizationType?: string | null | undefined;
    visState?: string | undefined;
    uiStateJSON?: string | undefined;
    savedSearchRefName?: string | undefined;
} & {
    title: string;
    references: Readonly<{
        id: string;
        type: string;
        name: string;
    }>[];
}>>;
export declare const lensCreateResponseBodySchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    data: import("@kbn/config-schema").Type<import("@kbn/lens-embeddable-utils").LensApiConfig | Readonly<{
        state?: any;
        description?: string | undefined;
        version?: 2 | undefined;
    } & {
        title: string;
        references: Readonly<{
            id: string;
            type: string;
            name: string;
        }>[];
        visualizationType: string;
    }>>;
    meta: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<string>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
        originId: import("@kbn/config-schema").Type<string | undefined>;
        createdAt: import("@kbn/config-schema").Type<string | undefined>;
        updatedAt: import("@kbn/config-schema").Type<string | undefined>;
        createdBy: import("@kbn/config-schema").Type<string | undefined>;
        updatedBy: import("@kbn/config-schema").Type<string | undefined>;
    }>;
}>;
