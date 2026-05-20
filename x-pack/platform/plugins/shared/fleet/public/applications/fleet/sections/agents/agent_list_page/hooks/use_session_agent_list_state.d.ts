import type { CriteriaWithPagination } from '@elastic/eui';
import type { Agent } from '../../../../types';
interface AgentListTableState {
    search: string;
    selectedAgentPolicies: string[];
    selectedStatus: string[];
    selectedTags: string[];
    showUpgradeable: boolean;
    sort: {
        field: keyof Agent;
        direction: 'asc' | 'desc';
    };
    page: {
        index: number;
        size: number;
    };
}
type SessionAgentListState = AgentListTableState & {
    clearFilters: () => void;
    updateTableState: (partialState: Partial<AgentListTableState>) => void;
    onTableChange: (changes: Partial<CriteriaWithPagination<Agent>>) => void;
};
export declare const defaultAgentListState: AgentListTableState;
export declare const useSessionAgentListState: () => SessionAgentListState;
export {};
