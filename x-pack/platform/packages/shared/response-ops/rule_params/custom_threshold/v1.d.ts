import type { TypeOf } from '@kbn/config-schema';
export declare const customThresholdParamsSchema: import("@kbn/config-schema").ObjectType<{
    criteria: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
        aggType?: "custom" | undefined;
        equation?: string | undefined;
        warningThreshold?: number[] | undefined;
        warningComparator?: string | undefined;
    } & {
        metrics: (Readonly<{
            filter?: string | undefined;
        } & {
            field: string;
            name: string;
            aggType: string;
        }> | Readonly<{
            filter?: string | undefined;
        } & {
            field: never;
            name: string;
            aggType: "count";
        }>)[];
        metric: never;
        threshold: number[];
        comparator: string;
        timeUnit: string;
        timeSize: number;
    }>[]>;
    groupBy: import("@kbn/config-schema").Type<string | string[] | undefined>;
    alertOnNoData: import("@kbn/config-schema").Type<boolean | undefined>;
    alertOnGroupDisappear: import("@kbn/config-schema").Type<boolean | undefined>;
    noDataBehavior: import("@kbn/config-schema").Type<"alertOnNoData" | "recover" | "remainActive" | undefined>;
    searchConfiguration: import("@kbn/config-schema").ObjectType<{
        index: import("@kbn/config-schema").Type<string | Readonly<{
            id?: string | undefined;
            type?: string | undefined;
            fields?: Record<string, Readonly<{
                script?: string | undefined;
                customLabel?: string | undefined;
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                searchable?: boolean | undefined;
                aggregatable?: boolean | undefined;
                esTypes?: string[] | undefined;
                subType?: Readonly<{
                    nested?: Readonly<{} & {
                        path: string;
                    }> | undefined;
                    multi?: Readonly<{} & {
                        parent: string;
                    }> | undefined;
                } & {}> | undefined;
                count?: number | undefined;
                runtimeField?: Readonly<{
                    script?: Readonly<{} & {
                        source: string;
                    }> | undefined;
                    customLabel?: string | undefined;
                    format?: Readonly<{
                        id?: string | undefined;
                        params?: any;
                    } & {}> | undefined;
                    customDescription?: string | undefined;
                    popularity?: number | undefined;
                } & {
                    type: "boolean" | "composite" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
                }> | Readonly<{
                    script?: Readonly<{} & {
                        source: string;
                    }> | undefined;
                    fields?: Record<string, Readonly<{
                        customLabel?: string | undefined;
                        format?: Readonly<{
                            id?: string | undefined;
                            params?: any;
                        } & {}> | undefined;
                        customDescription?: string | undefined;
                        popularity?: number | undefined;
                    } & {
                        type: "boolean" | "composite" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
                    }>> | undefined;
                } & {
                    type: "boolean" | "composite" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
                }> | undefined;
                customDescription?: string | undefined;
                scripted?: boolean | undefined;
                readFromDocValues?: boolean | undefined;
                shortDotsEnable?: boolean | undefined;
            } & {
                type: string;
                name: string;
            }>> | undefined;
            version?: string | undefined;
            name?: string | undefined;
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
            runtimeFieldMap?: Record<string, Readonly<{
                script?: Readonly<{} & {
                    source: string;
                }> | undefined;
                customLabel?: string | undefined;
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "composite" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
            }> | Readonly<{
                script?: Readonly<{} & {
                    source: string;
                }> | undefined;
                fields?: Record<string, Readonly<{
                    customLabel?: string | undefined;
                    format?: Readonly<{
                        id?: string | undefined;
                        params?: any;
                    } & {}> | undefined;
                    customDescription?: string | undefined;
                    popularity?: number | undefined;
                } & {
                    type: "boolean" | "composite" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
                }>> | undefined;
            } & {
                type: "boolean" | "composite" | "ip" | "date" | "geo_point" | "double" | "keyword" | "long";
            }>> | undefined;
            fieldAttrs?: Record<string, Readonly<{
                customLabel?: string | undefined;
                count?: number | undefined;
                customDescription?: string | undefined;
            } & {}>> | undefined;
            allowNoIndex?: boolean | undefined;
            namespaces?: string[] | undefined;
            allowHidden?: boolean | undefined;
            managed?: boolean | undefined;
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
