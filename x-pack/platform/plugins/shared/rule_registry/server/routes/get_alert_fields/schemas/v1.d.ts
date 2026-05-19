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
        subType?: Readonly<{
            nested?: Readonly<{} & {
                path: string;
            }> | undefined;
            multi?: Readonly<{} & {
                parent: string;
            }> | undefined;
        } & {}> | undefined;
        timeZone?: string[] | undefined;
        fixedInterval?: string[] | undefined;
        timeSeriesDimension?: boolean | undefined;
        timeSeriesMetric?: "summary" | "histogram" | "counter" | "position" | "gauge" | undefined;
        defaultFormatter?: string | undefined;
        metadata_field?: boolean | undefined;
    } & {
        name: string;
        type: string;
        esTypes: string[];
        searchable: boolean;
        aggregatable: boolean;
        readFromDocValues: boolean;
    }>[]>;
}>;
export type GetAlertFieldsRequest = TypeOf<typeof getAlertFieldsRequestSchema>;
export type GetAlertFieldsResponse = TypeOf<typeof getAlertFieldsResponseSchema>;
