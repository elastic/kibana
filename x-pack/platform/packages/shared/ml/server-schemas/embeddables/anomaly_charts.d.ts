import type { TypeOf } from '@kbn/config-schema';
export declare const severityThresholdSchema: import("@kbn/config-schema").ObjectType<{
    min: import("@kbn/config-schema").Type<number>;
    max: import("@kbn/config-schema").Type<number | undefined>;
}>;
export type SeverityThreshold = TypeOf<typeof severityThresholdSchema>;
export declare const anomalyChartsEmbeddableRuntimeStateSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[]>;
    maxSeriesToPlot: import("@kbn/config-schema").Type<number>;
    severityThreshold: import("@kbn/config-schema").Type<Readonly<{
        max?: number | undefined;
    } & {
        min: number;
    }>[] | undefined>;
    selectedEntities: import("@kbn/config-schema").Type<Readonly<{
        cardinality?: number | undefined;
        operation?: "-" | "+" | undefined;
        fieldType?: import("@kbn/ml-anomaly-utils").ML_ENTITY_FIELD_TYPE | undefined;
        fieldValue?: string | number | undefined;
    } & {
        fieldName: string;
    }>[] | undefined>;
}>;
export type AnomalyChartsEmbeddableRuntimeState = TypeOf<typeof anomalyChartsEmbeddableRuntimeStateSchema>;
export declare const anomalyChartsEmbeddableOverridableStateSchema: import("@kbn/config-schema").ObjectType<{
    time_range: import("@kbn/config-schema").Type<Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
    jobIds: import("@kbn/config-schema").Type<string[]>;
    maxSeriesToPlot: import("@kbn/config-schema").Type<number>;
    severityThreshold: import("@kbn/config-schema").Type<Readonly<{
        max?: number | undefined;
    } & {
        min: number;
    }>[] | undefined>;
    selectedEntities: import("@kbn/config-schema").Type<Readonly<{
        cardinality?: number | undefined;
        operation?: "-" | "+" | undefined;
        fieldType?: import("@kbn/ml-anomaly-utils").ML_ENTITY_FIELD_TYPE | undefined;
        fieldValue?: string | number | undefined;
    } & {
        fieldName: string;
    }>[] | undefined>;
}>;
export type AnomalyChartsEmbeddableOverridableState = TypeOf<typeof anomalyChartsEmbeddableOverridableStateSchema>;
export declare const anomalyChartsEmbeddableStateSchema: import("@kbn/config-schema").ObjectType<{
    time_range: import("@kbn/config-schema").Type<Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
    jobIds: import("@kbn/config-schema").Type<string[]>;
    maxSeriesToPlot: import("@kbn/config-schema").Type<number>;
    severityThreshold: import("@kbn/config-schema").Type<Readonly<{
        max?: number | undefined;
    } & {
        min: number;
    }>[] | undefined>;
    selectedEntities: import("@kbn/config-schema").Type<Readonly<{
        cardinality?: number | undefined;
        operation?: "-" | "+" | undefined;
        fieldType?: import("@kbn/ml-anomaly-utils").ML_ENTITY_FIELD_TYPE | undefined;
        fieldValue?: string | number | undefined;
    } & {
        fieldName: string;
    }>[] | undefined>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    hide_title: import("@kbn/config-schema").Type<boolean | undefined>;
    title: import("@kbn/config-schema").Type<string | undefined>;
    hide_border: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export type AnomalyChartsEmbeddableState = TypeOf<typeof anomalyChartsEmbeddableStateSchema>;
