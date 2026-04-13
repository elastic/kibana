import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { Action } from '@kbn/ui-actions-plugin/public';
import type { QualityIssueType } from '../state_machines/dataset_quality_details_controller';
export declare const useQualityIssuesDocsChart: () => {
    attributes: {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsXY";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: import("@kbn/lens-common").XYState;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsPie";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: import("@kbn/lens-common").LensPartitionVisualizationState;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsHeatmap";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: import("@kbn/lens-common").HeatmapVisualizationState;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsGauge";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: import("@kbn/lens-common").GaugeVisualizationState;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsDatatable";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: import("@kbn/lens-common").DatatableVisualizationState;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsMetric";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: import("@kbn/lens-common").MetricVisualizationState;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsChoropleth";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: import("@kbn/lens-common").ChoroplethChartState;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsTagcloud";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: import("@kbn/lens-common").LensTagCloudState;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: string;
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: unknown;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsLegacyMetric";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
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
        };
    } | undefined;
    dataView: DataView | undefined;
    breakdown: {
        dataViewField: DataViewField | undefined;
        fieldSupportsBreakdown: boolean;
        onChange: (field: DataViewField | undefined) => void;
    };
    extraActions: Action<object, object>[];
    isChartLoading: boolean | undefined;
    redirectLinkProps: {
        linkProps: import("@kbn/router-utils/src/get_router_link_props").RouterLinkProps;
        navigate: () => void;
    };
    handleDocsTrendChartChange: (qualityIssuesChart: QualityIssueType) => void;
    onChartLoading: (isLoading: boolean) => void;
    setAttributes: import("react").Dispatch<import("react").SetStateAction<{
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsXY";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: import("@kbn/lens-common").XYState;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsPie";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: import("@kbn/lens-common").LensPartitionVisualizationState;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsHeatmap";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: import("@kbn/lens-common").HeatmapVisualizationState;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsGauge";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: import("@kbn/lens-common").GaugeVisualizationState;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsDatatable";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: import("@kbn/lens-common").DatatableVisualizationState;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsMetric";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: import("@kbn/lens-common").MetricVisualizationState;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsChoropleth";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: import("@kbn/lens-common").ChoroplethChartState;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsTagcloud";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: import("@kbn/lens-common").LensTagCloudState;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: string;
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
            internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
            datasourceStates: {
                formBased?: import("@kbn/lens-common").FormBasedPersistedState;
                textBased?: import("@kbn/lens-common").TextBasedPersistedState;
            };
            visualization: unknown;
        };
    } | {
        version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
        title: string;
        description?: string | undefined;
        references: import("@kbn/content-management-utils").Reference[];
        visualizationType: "lnsLegacyMetric";
        state: {
            query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
            filters: import("@kbn/es-query").Filter[];
            globalPalette?: {
                activePaletteId: string;
                state?: unknown;
            } | undefined;
            needsRefresh?: boolean | undefined;
            adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
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
        };
    } | undefined>>;
    setIsChartLoading: import("react").Dispatch<import("react").SetStateAction<boolean | undefined>>;
};
