import type { DocLinksStart, ThemeServiceStart } from '@kbn/core/public';
import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import { type TimeRange } from '@kbn/es-query';
import type { Query } from '@kbn/data-plugin/common';
import { type SearchResponseWarning } from '@kbn/search-response-warnings';
import type { estypes } from '@elastic/elasticsearch';
import type { DateRange, FormBasedLayer, FormBasedPersistedState, FormBasedPrivateState, FramePublicAPI, IndexPattern, UserMessage, VisualizationInfo, GenericIndexPatternColumn, StateSetter } from '@kbn/lens-common';
export declare function isSamplingValueEnabled(layer: FormBasedLayer): boolean;
/**
 * Centralized logic to get the actual random sampling value for a layer
 * @param layer
 * @returns
 */
export declare function getSamplingValue(layer: FormBasedLayer): number;
export declare function isColumnInvalid(layer: FormBasedLayer, column: GenericIndexPatternColumn, columnId: string, indexPattern: IndexPattern, dateRange: DateRange, targetBars: number): boolean;
export declare function fieldIsInvalid(layer: FormBasedLayer, columnId: string, indexPattern: IndexPattern): boolean;
export declare function getSearchWarningMessages(state: FormBasedPersistedState, warning: SearchResponseWarning, request: estypes.SearchRequest, response: estypes.SearchResponse, theme: ThemeServiceStart): UserMessage[];
export declare function getUnsupportedOperationsWarningMessage(state: FormBasedPrivateState, { dataViews }: FramePublicAPI, docLinks: DocLinksStart): UserMessage[];
export declare function getPrecisionErrorWarningMessages(datatableUtilities: DatatableUtilitiesService, state: FormBasedPrivateState, { activeData, dataViews }: FramePublicAPI, docLinks: DocLinksStart, setState?: StateSetter<FormBasedPrivateState>): UserMessage[];
export declare function getVisualDefaultsForLayer(layer: FormBasedLayer): Record<string, Record<string, unknown>>;
export declare function getNotifiableFeatures(state: FormBasedPrivateState, frame: FramePublicAPI, visualizationInfo?: VisualizationInfo): UserMessage[];
export declare function getFiltersInLayer(layer: FormBasedLayer, columnIds: string[], layerData: NonNullable<FramePublicAPI['activeData']>[string] | undefined, indexPattern: IndexPattern, timeRange: TimeRange | undefined): {
    error: string;
    enabled?: undefined;
    disabled?: undefined;
} | {
    enabled: {
        kuery: Query[][];
        lucene: Query[][];
    };
    disabled: {
        kuery: Query[][];
        lucene: Query[][];
    };
    error?: undefined;
};
export declare const cloneLayer: (layers: Record<string, FormBasedLayer>, layerId: string, newLayerId: string, getNewId: (id: string) => string) => Record<string, FormBasedLayer>;
