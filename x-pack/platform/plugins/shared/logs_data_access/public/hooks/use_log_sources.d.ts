import type { LogSource, LogSourcesService } from '../../common/services/log_sources_service/types';
export declare const useLogSources: ({ logSourcesService }: {
    logSourcesService: LogSourcesService;
}) => {
    isUninitialized: boolean;
    isLoadingLogSources: boolean;
    hasFailedLoadingLogSources: boolean;
    logSourcesError: Error | undefined;
    logSources: LogSource[];
    combinedIndices: string;
};
export declare const LogSourcesProvider: import("react").FC<import("react").PropsWithChildren<{
    logSourcesService: LogSourcesService;
}>>, useLogSourcesContext: () => {
    isUninitialized: boolean;
    isLoadingLogSources: boolean;
    hasFailedLoadingLogSources: boolean;
    logSourcesError: Error | undefined;
    logSources: LogSource[];
    combinedIndices: string;
};
