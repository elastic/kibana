import type { CasesConfigurationUI } from '../types';
export declare const useGetCaseConfiguration: ({ keepPreviousData, }?: {
    keepPreviousData?: boolean;
}) => import("@tanstack/react-query").DefinedUseQueryResult<CasesConfigurationUI, import("../../types").ServerError>;
export type UseGetCaseConfiguration = ReturnType<typeof useGetCaseConfiguration>;
