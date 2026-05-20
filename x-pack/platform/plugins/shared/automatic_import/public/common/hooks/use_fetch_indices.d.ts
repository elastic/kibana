export interface UseFetchIndicesResult {
    indices: string[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
}
interface IndexManagementListItem {
    name: string;
    hidden?: boolean;
    data_stream?: string | null;
}
export declare function buildSelectableIndexAndDataStreamNames(rows: IndexManagementListItem[]): string[];
export declare function useFetchIndices(): UseFetchIndicesResult;
export {};
