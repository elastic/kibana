import type { TypeOf } from '@kbn/config-schema';
export declare const customThresholdParamsSchema: import("@kbn/config-schema").ObjectType<{
    criteria: import("@kbn/config-schema").Type<Readonly<{
        warningThreshold?: number[] | undefined;
        warningComparator?: string | undefined;
        aggType?: "custom" | undefined;
        equation?: string | undefined;
        label?: string | undefined;
    } & {
        threshold: number[];
        comparator: string;
        timeUnit: string;
        timeSize: number;
        metric: never;
        metrics: (Readonly<{
            filter?: string | undefined;
        } & {
            name: string;
            aggType: string;
            field: string;
        }> | Readonly<{
            filter?: string | undefined;
        } & {
            name: string;
            aggType: "count";
            field: never;
        }>)[];
    }>[]>;
    groupBy: import("@kbn/config-schema").Type<string | string[] | undefined>;
    alertOnNoData: import("@kbn/config-schema").Type<boolean | undefined>;
    alertOnGroupDisappear: import("@kbn/config-schema").Type<boolean | undefined>;
    noDataBehavior: import("@kbn/config-schema").Type<"alertOnNoData" | "recover" | "remainActive" | undefined>;
    searchConfiguration: import("@kbn/config-schema").ObjectType<{
        index: import("@kbn/config-schema").Type<string | Readonly<{
            version?: string | undefined;
            id?: string | undefined;
            type?: string | undefined;
            timeFieldName?: string | undefined;
            sourceFilters?: Readonly<{
                clientId?: string | number | undefined;
            } & {
                value: string;
            }>[] | undefined;
            fields?: Record<string, Readonly<{
                count?: number | undefined;
                script?: string | undefined;
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                esTypes?: string[] | undefined;
                scripted?: boolean | undefined;
                subType?: Readonly<{
                    multi?: Readonly<{} & {
                        parent: string;
                    }> | undefined;
                    nested?: Readonly<{} & {
                        path: string;
                    }> | undefined;
                } & {}> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                shortDotsEnable?: boolean | undefined;
                searchable?: boolean | undefined;
                aggregatable?: boolean | undefined;
                readFromDocValues?: boolean | undefined;
                runtimeField?: Readonly<{
                    script?: Readonly<{} & {
                        source: string;
                    }> | undefined;
                    format?: Readonly<{
                        id?: string | undefined;
                        params?: any;
                    } & {}> | undefined;
                    customLabel?: string | undefined;
                    customDescription?: string | undefined;
                    popularity?: number | undefined;
                } & {
                    type: "boolean" | "composite" | "date" | "double" | "geo_point" | "ip" | "keyword" | "long";
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
                        type: "boolean" | "composite" | "date" | "double" | "geo_point" | "ip" | "keyword" | "long";
                    }>> | undefined;
                } & {
                    type: "boolean" | "composite" | "date" | "double" | "geo_point" | "ip" | "keyword" | "long";
                }> | undefined;
            } & {
                name: string;
                type: string;
            }>> | undefined;
            typeMeta?: Readonly<{} & {}> | undefined;
            fieldFormats?: Record<string, Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}>> | undefined;
            fieldAttrs?: Record<string, Readonly<{
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                count?: number | undefined;
            } & {}>> | undefined;
            allowNoIndex?: boolean | undefined;
            runtimeFieldMap?: Record<string, Readonly<{
                script?: Readonly<{} & {
                    source: string;
                }> | undefined;
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "composite" | "date" | "double" | "geo_point" | "ip" | "keyword" | "long";
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
                    type: "boolean" | "composite" | "date" | "double" | "geo_point" | "ip" | "keyword" | "long";
                }>> | undefined;
            } & {
                type: "boolean" | "composite" | "date" | "double" | "geo_point" | "ip" | "keyword" | "long";
            }>> | undefined;
            name?: string | undefined;
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
