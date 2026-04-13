import type { Condition } from '@kbn/streamlang';
export interface FetchSuggestedPartitionsParams {
    streamName: string;
    connectorId: string;
    start: number;
    end: number;
}
export interface PartitionSuggestion {
    name: string;
    condition: Condition;
}
export type PartitionSuggestionReason = 'no_clusters' | 'no_samples' | 'all_data_partitioned';
export type UseReviewSuggestionsFormResult = ReturnType<typeof useReviewSuggestionsForm>;
export declare function useReviewSuggestionsForm(): {
    suggestions: PartitionSuggestion[] | undefined;
    suggestionReason: PartitionSuggestionReason | undefined;
    removeSuggestion: (index: number) => void;
    isLoadingSuggestions: boolean;
    fetchSuggestions: (params: FetchSuggestedPartitionsParams) => Promise<void>;
    resetForm: () => void;
    updateSuggestion: (index: number, updates: Partial<PartitionSuggestion>) => void;
    previewSuggestion: (index: number, toggle?: boolean) => void;
    acceptSuggestion: (index: number) => void;
    rejectSuggestion: (index: number, isSelectedPreview?: boolean) => void;
};
