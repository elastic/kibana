interface GetIsEceParams {
    isCloudEnabled: boolean;
    isServerlessEnabled: boolean;
    isSaasContainer?: boolean;
}
export declare function getIsEce({ isCloudEnabled, isServerlessEnabled, isSaasContainer, }: GetIsEceParams): boolean | undefined;
export {};
