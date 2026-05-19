import type { TypedLensSerializedState } from '@kbn/lens-common';
export declare const useCurrentAttributes: ({ textBasedMode, initialAttributes, }: {
    initialAttributes?: TypedLensSerializedState["attributes"];
    textBasedMode?: boolean;
}) => {
    version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION | undefined;
    description?: string | undefined;
    title: string;
    references: import("@kbn/content-management-utils").Reference[];
    visualizationType: string;
    state: {
        filters: import("@kbn/es-query").Filter[];
        query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
        adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec> | undefined;
        globalPalette?: {
            activePaletteId: string;
            state?: unknown;
        } | undefined;
        needsRefresh?: boolean | undefined;
        internalReferences?: import("@kbn/content-management-utils").Reference[] | undefined;
        datasourceStates: {
            formBased?: import("@kbn/lens-common").FormBasedPersistedState;
            textBased?: import("@kbn/lens-common").TextBasedPersistedState;
        };
        visualization: unknown;
    };
} | undefined;
