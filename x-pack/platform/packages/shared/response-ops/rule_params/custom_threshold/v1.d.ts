import type { TypeOf } from '@kbn/config-schema';
export declare const customThresholdParamsSchema: import("@kbn/config-schema").ObjectType<{
    criteria: import("@kbn/config-schema").Type<Readonly<{
        label?: string | undefined;
        aggType?: "custom" | undefined;
        equation?: string | undefined;
    } & {
        metric: never;
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
            managed?: boolean | undefined;
            version?: string | undefined;
            fields?: Record<string, Readonly<{
                script?: string | undefined;
                subType?: Readonly<{
                    nested?: Readonly<{} & {
                        path: string;
                    }> | undefined;
                    multi?: Readonly<{} & {
                        parent: string;
                    }> | undefined;
                } & {}> | undefined;
                scripted?: boolean | undefined;
                esTypes?: string[] | undefined;
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customLabel?: string | undefined;
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
                    type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
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
                        type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
                    }>> | undefined;
                } & {
                    type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
                }> | undefined;
                count?: number | undefined;
                customDescription?: string | undefined;
                searchable?: boolean | undefined;
                aggregatable?: boolean | undefined;
                readFromDocValues?: boolean | undefined;
                shortDotsEnable?: boolean | undefined;
            } & {
                type: string;
                name: string;
            }>> | undefined;
            fieldFormats?: Record<string, Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}>> | undefined;
            timeFieldName?: string | undefined;
            sourceFilters?: Readonly<{
                clientId?: string | number | undefined;
            } & {
                value: string;
            }>[] | undefined;
            typeMeta?: Readonly<{} & {}> | undefined;
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
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
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
                    type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
                }>> | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }>> | undefined;
            fieldAttrs?: Record<string, Readonly<{
                customLabel?: string | undefined;
                count?: number | undefined;
                customDescription?: string | undefined;
            } & {}>> | undefined;
            allowNoIndex?: boolean | undefined;
            namespaces?: string[] | undefined;
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
