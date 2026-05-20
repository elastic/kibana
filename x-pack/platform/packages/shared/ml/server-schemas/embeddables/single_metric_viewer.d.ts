import type { TypeOf } from '@kbn/config-schema';
export declare const singleMetricViewerEmbeddableUserInputSchema: import("@kbn/config-schema").ObjectType<{
    panelTitle: import("@kbn/config-schema").Type<string | undefined>;
    forecastId: import("@kbn/config-schema").Type<string | undefined>;
    functionDescription: import("@kbn/config-schema").Type<string | undefined>;
    jobIds: import("@kbn/config-schema").Type<string[]>;
    selectedDetectorIndex: import("@kbn/config-schema").Type<number>;
    selectedEntities: import("@kbn/config-schema").Type<Record<string, string | number | undefined> | undefined>;
}>;
export type SingleMetricViewerEmbeddableUserInput = TypeOf<typeof singleMetricViewerEmbeddableUserInputSchema>;
export declare const singleMetricViewerEmbeddableCustomInputSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    filters: import("@kbn/config-schema").Type<Readonly<{
        query?: Record<string, any> | undefined;
        $state?: Readonly<{
            store: import("@kbn/es-query-constants").FilterStateStore;
        }> | undefined;
    } & {
        meta: Readonly<{
            type?: string | undefined;
            index?: string | undefined;
            key?: string | undefined;
            field?: string | undefined;
            value?: any;
            params?: any;
            disabled?: boolean | undefined;
            group?: string | undefined;
            alias?: string | null | undefined;
            negate?: boolean | undefined;
            relation?: string | undefined;
            controlledBy?: string | undefined;
            isMultiIndex?: boolean | undefined;
        } & {}>;
    }>[] | undefined>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined>;
    refreshConfig: import("@kbn/config-schema").Type<Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined>;
    time_range: import("@kbn/config-schema").Type<Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
    forecastId: import("@kbn/config-schema").Type<string | undefined>;
    functionDescription: import("@kbn/config-schema").Type<string | undefined>;
    jobIds: import("@kbn/config-schema").Type<string[]>;
    selectedDetectorIndex: import("@kbn/config-schema").Type<number>;
    selectedEntities: import("@kbn/config-schema").Type<Record<string, string | number | undefined> | undefined>;
}>;
export type SingleMetricViewerEmbeddableCustomInput = TypeOf<typeof singleMetricViewerEmbeddableCustomInputSchema>;
export declare const singleMetricViewerEmbeddableInputSchema: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string | undefined>;
    id: import("@kbn/config-schema").Type<string | undefined>;
    filters: import("@kbn/config-schema").Type<Readonly<{
        query?: Record<string, any> | undefined;
        $state?: Readonly<{
            store: import("@kbn/es-query-constants").FilterStateStore;
        }> | undefined;
    } & {
        meta: Readonly<{
            type?: string | undefined;
            index?: string | undefined;
            key?: string | undefined;
            field?: string | undefined;
            value?: any;
            params?: any;
            disabled?: boolean | undefined;
            group?: string | undefined;
            alias?: string | null | undefined;
            negate?: boolean | undefined;
            relation?: string | undefined;
            controlledBy?: string | undefined;
            isMultiIndex?: boolean | undefined;
        } & {}>;
    }>[] | undefined>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined>;
    refreshConfig: import("@kbn/config-schema").Type<Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined>;
    time_range: import("@kbn/config-schema").Type<Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
    forecastId: import("@kbn/config-schema").Type<string | undefined>;
    functionDescription: import("@kbn/config-schema").Type<string | undefined>;
    jobIds: import("@kbn/config-schema").Type<string[]>;
    selectedDetectorIndex: import("@kbn/config-schema").Type<number>;
    selectedEntities: import("@kbn/config-schema").Type<Record<string, string | number | undefined> | undefined>;
}>;
export type SingleMetricViewerEmbeddableInput = TypeOf<typeof singleMetricViewerEmbeddableInputSchema>;
export declare const singleMetricViewerEmbeddableStateSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    filters: import("@kbn/config-schema").Type<Readonly<{
        query?: Record<string, any> | undefined;
        $state?: Readonly<{
            store: import("@kbn/es-query-constants").FilterStateStore;
        }> | undefined;
    } & {
        meta: Readonly<{
            type?: string | undefined;
            index?: string | undefined;
            key?: string | undefined;
            field?: string | undefined;
            value?: any;
            params?: any;
            disabled?: boolean | undefined;
            group?: string | undefined;
            alias?: string | null | undefined;
            negate?: boolean | undefined;
            relation?: string | undefined;
            controlledBy?: string | undefined;
            isMultiIndex?: boolean | undefined;
        } & {}>;
    }>[] | undefined>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        query: string | Record<string, any>;
        language: string;
    }> | undefined>;
    refreshConfig: import("@kbn/config-schema").Type<Readonly<{} & {
        pause: boolean;
        value: number;
    }> | undefined>;
    time_range: import("@kbn/config-schema").Type<Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined>;
    forecastId: import("@kbn/config-schema").Type<string | undefined>;
    functionDescription: import("@kbn/config-schema").Type<string | undefined>;
    jobIds: import("@kbn/config-schema").Type<string[]>;
    selectedDetectorIndex: import("@kbn/config-schema").Type<number>;
    selectedEntities: import("@kbn/config-schema").Type<Record<string, string | number | undefined> | undefined>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    hide_title: import("@kbn/config-schema").Type<boolean | undefined>;
    title: import("@kbn/config-schema").Type<string | undefined>;
    hide_border: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export type SingleMetricViewerEmbeddableState = TypeOf<typeof singleMetricViewerEmbeddableStateSchema>;
