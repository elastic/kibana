import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { GetGuards } from '../shared_services';
import { resultsServiceProvider } from '../../models/results_service';
type OrigResultsServiceProvider = ReturnType<typeof resultsServiceProvider>;
export interface ResultsServiceProvider {
    resultsServiceProvider(request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract): {
        getAnomaliesTableData: OrigResultsServiceProvider['getAnomaliesTableData'];
    };
}
export declare function getResultsServiceProvider(getGuards: GetGuards): ResultsServiceProvider;
export {};
