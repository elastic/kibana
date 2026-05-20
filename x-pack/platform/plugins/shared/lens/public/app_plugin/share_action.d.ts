import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { LensAppState, LensDocument, DatasourceMap, VisualizationMap, LensAppLocatorParams, LensAppServices } from '@kbn/lens-common';
export interface ShareableConfiguration extends Pick<LensAppState, 'activeDatasourceId' | 'datasourceStates' | 'visualization' | 'filters' | 'query'> {
    datasourceMap: DatasourceMap;
    visualizationMap: VisualizationMap;
    currentDoc?: LensDocument;
    adHocDataViews?: DataViewSpec[];
}
export declare const DEFAULT_LENS_LAYOUT_DIMENSIONS: {
    width: number;
    height: number;
};
export declare function getLocatorParams(data: LensAppServices['data'], { filters, query, activeDatasourceId, datasourceStates, datasourceMap, visualizationMap, visualization, adHocDataViews, currentDoc, }: ShareableConfiguration, isDirty: boolean): {
    shareURL: LensAppLocatorParams;
    reporting: LensAppLocatorParams | {
        filters: import("@kbn/es-query").Filter[];
        query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
        resolvedDateRange: {
            fromDate: string;
            toDate: string;
        };
        savedObjectId: string;
    };
};
export declare function getShareURL(shortUrlService: (params: LensAppLocatorParams) => Promise<string>, shareLocatorParams: LensAppLocatorParams, services: Pick<LensAppServices, 'application' | 'data'>, configuration: ShareableConfiguration, shareUrlEnabled: boolean): {
    shareableUrl: Promise<string> | undefined;
    savedObjectURL: URL;
};
