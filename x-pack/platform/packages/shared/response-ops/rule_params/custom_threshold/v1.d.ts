import type { TypeOf } from '@kbn/config-schema';
export declare const customThresholdParamsSchema: import("@kbn/config-schema").ObjectType<{
    criteria: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
        aggType?: "custom" | undefined;
        equation?: string | undefined;
    } & {
        metrics: (Readonly<{
            filter?: string | undefined;
        } & {
            name: string;
            field: string;
            aggType: string;
        }> | Readonly<{
            filter?: string | undefined;
        } & {
            name: string;
            field: never;
            aggType: "count";
        }>)[];
        metric: never;
        comparator: string;
        threshold: number[];
        timeUnit: string;
        timeSize: number;
    }>[]>;
    groupBy: import("@kbn/config-schema").Type<string | string[] | undefined>;
    alertOnNoData: import("@kbn/config-schema").Type<boolean | undefined>;
    alertOnGroupDisappear: import("@kbn/config-schema").Type<boolean | undefined>;
    noDataBehavior: import("@kbn/config-schema").Type<"alertOnNoData" | "recover" | "remainActive" | undefined>;
    searchConfiguration: import("@kbn/config-schema").ObjectType<{
        index: import("@kbn/config-schema").Type<string | Readonly<{
            type?: string | undefined;
            id?: string | undefined;
            name?: string | undefined;
            version?: string | undefined;
            fields?: Record<string, Readonly<{
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                script?: string | undefined;
                count?: number | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                esTypes?: string[] | undefined;
                scripted?: boolean | undefined;
                subType?: Readonly<{
                    nested?: Readonly<{} & {
                        path: string;
                    }> | undefined;
                    multi?: Readonly<{} & {
                        parent: string;
                    }> | undefined;
                } & {}> | undefined;
                shortDotsEnable?: boolean | undefined;
                searchable?: boolean | undefined;
                aggregatable?: boolean | undefined;
                readFromDocValues?: boolean | undefined;
                runtimeField?: Readonly<{
                    format?: Readonly<{
                        id?: string | undefined;
                        params?: any;
                    } & {}> | undefined;
                    script?: Readonly<{} & {
                        source: string;
                    }> | undefined;
                    customLabel?: string | undefined;
                    customDescription?: string | undefined;
                    popularity?: number | undefined;
                } & {
                    type: "boolean" | "ip" | "date" | "double" | "long" | "keyword" | "geo_point" | "composite";
                }> | Readonly<{
                    script?: Readonly<{} & {
                        source: string;
                    }> | undefined;
                    fields?: Record<string, Readonly<{
                        format?: Readonly<{
                            id?: string | undefined;
                            params?: any;
                        } & {}> | undefined;
                        customLabel?: string | undefined;
                        customDescription?: string | undefined;
                        popularity?: number | undefined;
                    } & {
                        type: "boolean" | "ip" | "date" | "double" | "long" | "keyword" | "geo_point" | "composite";
                    }>> | undefined;
                } & {
                    type: "boolean" | "ip" | "date" | "double" | "long" | "keyword" | "geo_point" | "composite";
                }> | undefined;
            } & {
                type: string;
                name: string;
            }>> | undefined;
            namespaces?: string[] | undefined;
            managed?: boolean | undefined;
            timeFieldName?: string | undefined;
            sourceFilters?: Readonly<{
                clientId?: string | number | undefined;
            } & {
                value: string;
            }>[] | undefined;
            typeMeta?: Readonly<{} & {}> | undefined;
            fieldFormats?: Record<string, Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}>> | undefined;
            fieldAttrs?: Record<string, Readonly<{
                count?: number | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
            } & {}>> | undefined;
            allowNoIndex?: boolean | undefined;
            runtimeFieldMap?: Record<string, Readonly<{
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                script?: Readonly<{} & {
                    source: string;
                }> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "ip" | "date" | "double" | "long" | "keyword" | "geo_point" | "composite";
            }> | Readonly<{
                script?: Readonly<{} & {
                    source: string;
                }> | undefined;
                fields?: Record<string, Readonly<{
                    format?: Readonly<{
                        id?: string | undefined;
                        params?: any;
                    } & {}> | undefined;
                    customLabel?: string | undefined;
                    customDescription?: string | undefined;
                    popularity?: number | undefined;
                } & {
                    type: "boolean" | "ip" | "date" | "double" | "long" | "keyword" | "geo_point" | "composite";
                }>> | undefined;
            } & {
                type: "boolean" | "ip" | "date" | "double" | "long" | "keyword" | "geo_point" | "composite";
            }>> | undefined;
            allowHidden?: boolean | undefined;
        } & {
            title: string;
        }>>;
        query: import("@kbn/config-schema").ObjectType<{
            language: import("@kbn/config-schema").Type<string>;
            query: import("@kbn/config-schema").Type<string>;
        }>;
        filter: import("@kbn/config-schema").Type<Readonly<{
            query?: Record<string, any> | undefined;
        } & {
            meta: Record<string, any>;
        }>[] | undefined>;
    }>;
}>;
export type CustomThresholdParams = TypeOf<typeof customThresholdParamsSchema>;
