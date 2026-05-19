import { type AggregateQuery } from '@kbn/es-query';
import type { CoreStart, IUiSettingsClient } from '@kbn/core/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { ESQLColumn, ESQLRow } from '@kbn/es-types';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { type DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { TypedLensSerializedState } from '@kbn/lens-common';
import type { DatasourceMap, VisualizationMap } from '@kbn/lens-common';
export interface ESQLDataGridAttrs {
    rows: ESQLRow[];
    dataView: DataView;
    columns: DatatableColumn[];
}
export declare const buildDisplayRowsFromEsqlValues: ({ displayColumns, valueColumns, values, }: {
    displayColumns: ESQLColumn[];
    valueColumns: ESQLColumn[];
    values: ESQLRow[];
}) => ESQLRow[];
export declare const getGridAttrs: (query: AggregateQuery, adHocDataViews: DataViewSpec[], data: DataPublicPluginStart, http: CoreStart["http"], uiSettings: IUiSettingsClient, abortController?: AbortController, esqlVariables?: ESQLControlVariable[]) => Promise<ESQLDataGridAttrs>;
export declare const getSuggestions: (query: AggregateQuery, data: DataPublicPluginStart, http: CoreStart["http"], uiSettings: IUiSettingsClient, datasourceMap: DatasourceMap, visualizationMap: VisualizationMap, adHocDataViews: DataViewSpec[], setErrors?: (errors: Error[]) => void, abortController?: AbortController, setDataGridAttrs?: (attrs: ESQLDataGridAttrs) => void, esqlVariables?: ESQLControlVariable[], shouldUpdateAttrs?: boolean, preferredVisAttributes?: TypedLensSerializedState["attributes"]) => Promise<{
    state: {
        needsRefresh: boolean;
        filters: import("@kbn/es-query").Filter[];
        query: import("@kbn/es-query").Query | AggregateQuery;
        adHocDataViews?: Record<string, DataViewSpec> | undefined;
        globalPalette?: {
            activePaletteId: string;
            state?: unknown;
        } | undefined;
        internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
        datasourceStates: {
            formBased?: import("@kbn/lens-common").FormBasedPersistedState;
            textBased?: import("@kbn/lens-common").TextBasedPersistedState;
        };
        visualization: import("@kbn/lens-common").XYPersistedState;
    } | {
        needsRefresh: boolean;
        filters: import("@kbn/es-query").Filter[];
        query: import("@kbn/es-query").Query | AggregateQuery;
        adHocDataViews?: Record<string, DataViewSpec> | undefined;
        globalPalette?: {
            activePaletteId: string;
            state?: unknown;
        } | undefined;
        internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
        datasourceStates: {
            formBased?: import("@kbn/lens-common").FormBasedPersistedState;
            textBased?: import("@kbn/lens-common").TextBasedPersistedState;
        };
        visualization: import("@kbn/lens-common").LensPartitionVisualizationState;
    } | {
        needsRefresh: boolean;
        filters: import("@kbn/es-query").Filter[];
        query: import("@kbn/es-query").Query | AggregateQuery;
        adHocDataViews?: Record<string, DataViewSpec> | undefined;
        globalPalette?: {
            activePaletteId: string;
            state?: unknown;
        } | undefined;
        internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
        datasourceStates: {
            formBased?: import("@kbn/lens-common").FormBasedPersistedState;
            textBased?: import("@kbn/lens-common").TextBasedPersistedState;
        };
        visualization: import("@kbn/lens-common").HeatmapVisualizationState;
    } | {
        needsRefresh: boolean;
        filters: import("@kbn/es-query").Filter[];
        query: import("@kbn/es-query").Query | AggregateQuery;
        adHocDataViews?: Record<string, DataViewSpec> | undefined;
        globalPalette?: {
            activePaletteId: string;
            state?: unknown;
        } | undefined;
        internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
        datasourceStates: {
            formBased?: import("@kbn/lens-common").FormBasedPersistedState;
            textBased?: import("@kbn/lens-common").TextBasedPersistedState;
        };
        visualization: import("@kbn/lens-common").GaugeVisualizationState;
    } | {
        needsRefresh: boolean;
        filters: import("@kbn/es-query").Filter[];
        query: import("@kbn/es-query").Query | AggregateQuery;
        adHocDataViews?: Record<string, DataViewSpec> | undefined;
        globalPalette?: {
            activePaletteId: string;
            state?: unknown;
        } | undefined;
        internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
        datasourceStates: {
            formBased?: import("@kbn/lens-common").FormBasedPersistedState;
            textBased?: import("@kbn/lens-common").TextBasedPersistedState;
        };
        visualization: import("@kbn/lens-common").DatatableVisualizationState;
    } | {
        needsRefresh: boolean;
        filters: import("@kbn/es-query").Filter[];
        query: import("@kbn/es-query").Query | AggregateQuery;
        adHocDataViews?: Record<string, DataViewSpec> | undefined;
        globalPalette?: {
            activePaletteId: string;
            state?: unknown;
        } | undefined;
        internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
        datasourceStates: {
            formBased?: import("@kbn/lens-common").FormBasedPersistedState;
            textBased?: import("@kbn/lens-common").TextBasedPersistedState;
        };
        visualization: {
            colorMode?: import("@kbn/charts-plugin/common").ColorMode | undefined;
            autoScaleMetricAlignment?: import("@kbn/expression-legacy-metric-vis-plugin/common/types").MetricAlignment | undefined;
            layerId: string;
            accessor?: string | undefined;
            layerType: import("@kbn/lens-common").LensLayerType;
            titlePosition?: import("@kbn/lens-common").LegacyMetricLabelPositionType | undefined;
            size?: string | undefined;
            textAlign?: import("@kbn/lens-common").LegacyMetricAlignment | undefined;
            palette?: import("@kbn/coloring").PaletteOutput<import("@kbn/coloring").CustomPaletteParams> | undefined;
        };
    } | {
        needsRefresh: boolean;
        filters: import("@kbn/es-query").Filter[];
        query: import("@kbn/es-query").Query | AggregateQuery;
        adHocDataViews?: Record<string, DataViewSpec> | undefined;
        globalPalette?: {
            activePaletteId: string;
            state?: unknown;
        } | undefined;
        internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
        datasourceStates: {
            formBased?: import("@kbn/lens-common").FormBasedPersistedState;
            textBased?: import("@kbn/lens-common").TextBasedPersistedState;
        };
        visualization: import("@kbn/lens-common").MetricVisualizationState;
    } | {
        needsRefresh: boolean;
        filters: import("@kbn/es-query").Filter[];
        query: import("@kbn/es-query").Query | AggregateQuery;
        adHocDataViews?: Record<string, DataViewSpec> | undefined;
        globalPalette?: {
            activePaletteId: string;
            state?: unknown;
        } | undefined;
        internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
        datasourceStates: {
            formBased?: import("@kbn/lens-common").FormBasedPersistedState;
            textBased?: import("@kbn/lens-common").TextBasedPersistedState;
        };
        visualization: import("@kbn/lens-common").ChoroplethChartState;
    } | {
        needsRefresh: boolean;
        filters: import("@kbn/es-query").Filter[];
        query: import("@kbn/es-query").Query | AggregateQuery;
        adHocDataViews?: Record<string, DataViewSpec> | undefined;
        globalPalette?: {
            activePaletteId: string;
            state?: unknown;
        } | undefined;
        internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
        datasourceStates: {
            formBased?: import("@kbn/lens-common").FormBasedPersistedState;
            textBased?: import("@kbn/lens-common").TextBasedPersistedState;
        };
        visualization: import("@kbn/lens-common").LensTagCloudState;
    } | {
        needsRefresh: boolean;
        filters: import("@kbn/es-query").Filter[];
        query: import("@kbn/es-query").Query | AggregateQuery;
        adHocDataViews?: Record<string, DataViewSpec> | undefined;
        globalPalette?: {
            activePaletteId: string;
            state?: unknown;
        } | undefined;
        internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
        datasourceStates: {
            formBased?: import("@kbn/lens-common").FormBasedPersistedState;
            textBased?: import("@kbn/lens-common").TextBasedPersistedState;
        };
        visualization: unknown;
    };
    version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
    description?: string | undefined;
    title: string;
    references: import("@kbn/content-management-utils").Reference[];
    visualizationType: string;
} | undefined>;
