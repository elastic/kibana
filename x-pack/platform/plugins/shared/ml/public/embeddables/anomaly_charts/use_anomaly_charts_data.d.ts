import type { CoreStart } from '@kbn/core/public';
import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import type { AnomalyChartsServices, AnomalyChartsApi } from '..';
import type { ExplorerChartsData } from '../../application/explorer/explorer_charts/explorer_charts_container_service';
import type { MlStartDependencies } from '../../plugin';
export declare function useAnomalyChartsData(api: AnomalyChartsApi, services: [CoreStart, MlStartDependencies, AnomalyChartsServices], chartWidth: number, severity: SeverityThreshold[], renderCallbacks: {
    onRenderComplete: () => void;
    onLoading: (v: boolean) => void;
    onError: (error: Error) => void;
}): {
    chartsData: ExplorerChartsData | undefined;
    isLoading: boolean;
    error: Error | null | undefined;
};
