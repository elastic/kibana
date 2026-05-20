import type { AgentPolicy } from '../../../../types';
export declare const getSortFieldForAPI: (field: string) => string;
export declare function useFetchAgentsData(): {
    allTags: string[] | undefined;
    setAllTags: import("react").Dispatch<import("react").SetStateAction<string[] | undefined>>;
    agentsOnCurrentPage: import("../../../../types").Agent[];
    agentsStatus: Record<import("../../../../types").SimplifiedAgentStatus, number> | undefined;
    isLoading: boolean;
    isInitialLoading: boolean;
    nAgentsInTable: number;
    totalInactiveAgents: number;
    totalManagedAgentIds: string[];
    managedAgentsOnCurrentPage: number;
    showUpgradeable: boolean;
    setShowUpgradeable: (value: boolean) => void;
    search: string;
    setSearch: (newVal: string) => void;
    selectedAgentPolicies: string[];
    setSelectedAgentPolicies: (value: string[]) => void;
    sort: {
        field: keyof import("../../../../types").Agent;
        direction: "asc" | "desc";
    };
    selectedStatus: string[];
    setSelectedStatus: (value: string[]) => void;
    selectedTags: string[];
    setSelectedTags: (value: string[]) => void;
    allAgentPolicies: AgentPolicy[];
    agentPoliciesRequest: import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<import("../../../../types").GetAgentPoliciesResponse, import("../../../../hooks").RequestError>;
    agentPoliciesIndexedById: {
        [k: string]: AgentPolicy;
    };
    page: {
        index: number;
        size: number;
    };
    pageSizeOptions: (100 | 20 | 50 | 200)[];
    kuery: string;
    draftKuery: string;
    setDraftKuery: import("react").Dispatch<import("react").SetStateAction<string>>;
    fetchData: ({ refreshTags }?: {
        refreshTags?: boolean;
    }) => Promise<import("@kbn/react-query").QueryObserverResult<{
        agentPoliciesIndexedById: {
            [k: string]: AgentPolicy;
        };
        agentsStatus: Record<import("../../../../types").SimplifiedAgentStatus, number>;
        agentsOnCurrentPage: import("../../../../types").Agent[];
        nAgentsInTable: number;
        totalInactiveAgents: number;
        newAllTags: string[];
        totalManagedAgentIds: string[];
        managedAgentsOnCurrentPage: number;
        queryKeyFilters: string;
    }, unknown>>;
    queryHasChanged: boolean;
    latestAgentActionErrors: string[];
    setLatestAgentActionErrors: import("react").Dispatch<import("react").SetStateAction<string[]>>;
    isUsingFilter: boolean;
    clearFilters: () => void;
    onTableChange: (changes: Partial<import("@elastic/eui/src/components/basic_table/basic_table").CriteriaWithPagination<import("../../../../types").Agent>>) => void;
};
