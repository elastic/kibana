import { resultsServiceRxProvider } from './result_service_rx';
import { resultsServiceProvider } from './results_service';
import type { MlApi } from '../ml_api_service';
export type MlResultsService = ReturnType<typeof resultsServiceProvider> & ReturnType<typeof resultsServiceRxProvider>;
type Time = string;
export interface ModelPlotOutputResults {
    results: Record<Time, {
        actual: number;
        modelUpper: number | null;
        modelLower: number | null;
    }>;
}
export declare function mlResultsServiceProvider(mlApi: MlApi): MlResultsService;
export declare function useMlResultsService(): MlResultsService;
export {};
