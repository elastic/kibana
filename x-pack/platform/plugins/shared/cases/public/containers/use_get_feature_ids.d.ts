interface UseGetFeatureIdsResponse {
    featureIds: string[];
    ruleTypeIds: string[];
}
export declare const useGetFeatureIds: (alertIds: string[], enabled: boolean) => {
    data: UseGetFeatureIdsResponse | undefined;
    isLoading: boolean;
};
export type UseGetFeatureIds = typeof useGetFeatureIds;
export {};
