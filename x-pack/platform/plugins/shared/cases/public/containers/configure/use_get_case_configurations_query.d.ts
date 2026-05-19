import type { ServerError } from '../../types';
import type { CasesConfigurationUI } from '../types';
export declare const useGetCaseConfigurationsQuery: <T>({ select, keepPreviousData, }: {
    select: (data: CasesConfigurationUI[] | null) => T;
    keepPreviousData?: boolean;
}) => import("@kbn/react-query").DefinedUseQueryResult<T, ServerError>;
export type UseGetAllCaseConfigurations = ReturnType<typeof useGetCaseConfigurationsQuery>;
