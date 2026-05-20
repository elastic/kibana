import type { CriteriaWithPagination } from '@elastic/eui';
import type { Agent } from '../../../../../../common/types';
interface UseCollectorsListOptions {
    refetchInterval: number | false;
}
export declare const useCollectorsList: ({ refetchInterval }: UseCollectorsListOptions) => {
    collectors: Agent[];
    totalCount: number;
    isLoading: boolean;
    isInitialLoading: boolean;
    isError: boolean;
    error: unknown;
    dataUpdatedAt: number;
    pageIndex: number;
    pageSize: number;
    searchQuery: string | undefined;
    setSearchQuery: (value: string | undefined) => void;
    onTableChange: (criteria: CriteriaWithPagination<Agent>) => void;
};
export {};
