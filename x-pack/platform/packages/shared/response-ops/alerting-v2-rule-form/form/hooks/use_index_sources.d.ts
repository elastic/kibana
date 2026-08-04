import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import type { EsqlDatasetsResult } from '@kbn/esql-types';
interface UseIndexSourcesParams {
    http: HttpStart;
    application: ApplicationStart;
    getDatasets?: () => Promise<EsqlDatasetsResult>;
}
export declare const useIndexSources: ({ http, application, getDatasets }: UseIndexSourcesParams) => {
    data: {
        label: string;
    }[];
    isLoading: boolean;
};
export {};
