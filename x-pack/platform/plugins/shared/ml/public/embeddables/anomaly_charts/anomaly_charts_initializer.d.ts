import type { FC } from 'react';
import type { AnomalyChartsEmbeddableState } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import type { MlApi } from '../../application/services/ml_api_service';
export declare const MAX_ANOMALY_CHARTS_ALLOWED = 50;
export interface AnomalyChartsInitializerProps {
    initialInput?: Partial<Pick<AnomalyChartsEmbeddableState, 'title' | 'jobIds' | 'maxSeriesToPlot'>>;
    onCreate: (props: {
        jobIds: AnomalyChartsEmbeddableState['jobIds'];
        title: string;
        maxSeriesToPlot: number;
    }) => void;
    onCancel: () => void;
    adJobsApiService: MlApi['jobs'];
}
export declare const AnomalyChartsInitializer: FC<AnomalyChartsInitializerProps>;
