export declare const useServiceToken: () => {
    serviceToken: string | undefined;
    isLoadingServiceToken: boolean;
    generateServiceToken: (remote?: boolean) => Promise<void>;
};
