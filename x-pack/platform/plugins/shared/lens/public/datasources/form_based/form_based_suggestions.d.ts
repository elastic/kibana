import type { DatasourceSuggestion, IndexPatternField, IndexPatternMap, NavigateToLensLayer, FormBasedPrivateState } from '@kbn/lens-common';
export type IndexPatternSuggestion = DatasourceSuggestion<FormBasedPrivateState>;
export declare function getDatasourceSuggestionsForField(state: FormBasedPrivateState, indexPatternId: string, field: IndexPatternField, indexPatterns: IndexPatternMap, filterLayers?: (layerId: string) => boolean): IndexPatternSuggestion[];
export declare function getDatasourceSuggestionsForVisualizeCharts(state: FormBasedPrivateState, contextLayers: NavigateToLensLayer[], indexPatterns: IndexPatternMap): IndexPatternSuggestion[];
export declare function getDatasourceSuggestionsForVisualizeField(state: FormBasedPrivateState, indexPatternId: string, fieldName: string, indexPatterns: IndexPatternMap): IndexPatternSuggestion[];
export declare function getDatasourceSuggestionsFromCurrentState(state: FormBasedPrivateState, indexPatterns?: IndexPatternMap, filterLayers?: (layerId: string) => boolean): Array<DatasourceSuggestion<FormBasedPrivateState>>;
