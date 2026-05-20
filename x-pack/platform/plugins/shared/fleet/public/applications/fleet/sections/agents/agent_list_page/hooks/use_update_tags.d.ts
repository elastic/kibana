export declare const useUpdateTags: () => {
    updateTags: (agentId: string, newTags: string[], onSuccess: () => void, successMessage?: string, errorMessage?: string) => Promise<void>;
    bulkUpdateTags: (agents: string[] | string, tagsToAdd: string[], tagsToRemove: string[], onSuccess: (hasCompleted?: boolean) => void, successMessage?: string, errorMessage?: string) => Promise<void>;
};
