export interface CollectorsFilter {
    kuery?: string;
    pageIndex: number;
}
export declare const useCollectorsUrlFilters: () => CollectorsFilter;
export declare const useSetCollectorsUrlFilters: () => (filters: Partial<CollectorsFilter>, options?: {
    replace?: boolean;
}) => void;
