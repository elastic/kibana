import type { TypeOf } from '@kbn/config-schema';
export declare const timeSeriesMetric: {
    readonly GAUGE: "gauge";
    readonly COUNTER: "counter";
    readonly SUMMARY: "summary";
    readonly HISTOGRAM: "histogram";
    readonly POSITION: "position";
};
export declare const getAlertFieldsRequestSchema: import("@kbn/config-schema").ObjectType<{
    rule_type_ids: import("@kbn/config-schema").Type<string | string[] | undefined>;
}>;
export declare const getAlertFieldsResponseSchema: import("@kbn/config-schema").ObjectType<{
    fields: import("@kbn/config-schema").Type<Readonly<{
        timeZone?: string[] | undefined;
        timeSeriesMetric?: "histogram" | "gauge" | "counter" | "summary" | "position" | undefined;
        subType?: Readonly<{
            nested?: Readonly<{} & {
                path: string;
            }> | undefined;
            multi?: Readonly<{} & {
                parent: string;
            }> | undefined;
        } & {}> | undefined;
        defaultFormatter?: string | undefined;
        timeSeriesDimension?: boolean | undefined;
        fixedInterval?: string[] | undefined;
        metadata_field?: boolean | undefined;
    } & {
        type: string;
        name: string;
        searchable: boolean;
        aggregatable: boolean;
        esTypes: string[];
        readFromDocValues: boolean;
    }>[]>;
}>;
export type GetAlertFieldsRequest = TypeOf<typeof getAlertFieldsRequestSchema>;
export type GetAlertFieldsResponse = TypeOf<typeof getAlertFieldsResponseSchema>;
