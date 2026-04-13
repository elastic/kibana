interface UseSnapshotRepositoriesOptions {
    enabled?: boolean;
}
export declare const useSnapshotRepositories: ({ enabled, }?: UseSnapshotRepositoriesOptions) => {
    repositories: string[];
    hasFetched: boolean;
    isLoading: boolean;
    error: Error | null;
    refresh: () => void;
};
export {};
