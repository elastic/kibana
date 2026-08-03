export declare const actionTaskParamsSchema: import("@kbn/config-schema").ObjectType<{
    actionId: import("@kbn/config-schema").Type<string>;
    executionId: import("@kbn/config-schema").Type<string | undefined>;
    apiKey: import("@kbn/config-schema").Type<string | null>;
    params: import("@kbn/config-schema").Type<Record<string, any>>;
    consumer: import("@kbn/config-schema").Type<string | undefined>;
    source: import("@kbn/config-schema").Type<string | undefined>;
    relatedSavedObjects: import("@kbn/config-schema").Type<Readonly<{
        namespace?: string | undefined;
        typeId?: string | undefined;
    } & {
        id: string;
        type: string;
    }>[] | undefined>;
}>;
