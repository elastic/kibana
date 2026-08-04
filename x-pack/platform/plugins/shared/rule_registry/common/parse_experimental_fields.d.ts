export declare const parseExperimentalFields: (input: unknown, partial?: boolean) => {
    readonly "kibana.alert.evaluation.threshold"?: number | undefined;
    readonly "kibana.alert.evaluation.time_range"?: unknown;
    readonly "kibana.alert.evaluation.value"?: number | undefined;
    readonly "kibana.alert.context"?: unknown;
    readonly "kibana.alert.evaluation.values"?: number[] | undefined;
    readonly "kibana.alert.grouping"?: unknown;
    readonly "kibana.alert.group"?: unknown[] | undefined;
    readonly "kibana.alert.group.field"?: string[] | undefined;
    readonly "kibana.alert.group.value"?: string[] | undefined;
};
export type ParsedExperimentalFields = ReturnType<typeof parseExperimentalFields>;
