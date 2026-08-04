export declare const findMutedAlertsOptionsSchema: import("@kbn/config-schema").ObjectType<{
    perPage: import("@kbn/config-schema").Type<number | undefined>;
    page: import("@kbn/config-schema").Type<number | undefined>;
    filter: import("@kbn/config-schema").Type<string | Record<string, any> | undefined>;
}>;
export declare const findMutedAlertsParamsSchema: import("@kbn/config-schema").ObjectType<{
    options: import("@kbn/config-schema").Type<Readonly<{
        page?: number | undefined;
        filter?: string | Record<string, any> | undefined;
        perPage?: number | undefined;
    } & {}> | undefined>;
}>;
