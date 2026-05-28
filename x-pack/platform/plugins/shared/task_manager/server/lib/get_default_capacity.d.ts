interface GetDefaultCapacityOpts {
    autoCalculateDefaultEchCapacity: boolean;
    claimStrategy?: string;
    heapSizeLimit: number;
    isCloud: boolean;
    isServerless: boolean;
    isBackgroundTaskNodeOnly: boolean;
}
export declare function getDefaultCapacity({ autoCalculateDefaultEchCapacity, claimStrategy, heapSizeLimit: heapSizeLimitInBytes, isCloud, isServerless, isBackgroundTaskNodeOnly, }: GetDefaultCapacityOpts): number;
export {};
