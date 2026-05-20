export declare function useLogstashApiKey(): {
    isLoading: boolean;
    generateApiKey: () => Promise<void>;
    apiKey: string | undefined;
};
