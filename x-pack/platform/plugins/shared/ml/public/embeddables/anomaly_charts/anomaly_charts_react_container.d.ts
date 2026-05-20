import type { FC } from 'react';
import type { Observable } from 'rxjs';
import type { TimeRange } from '@kbn/es-query';
import type { AnomalyChartsEmbeddableOverridableState } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import type { AnomalyChartsEmbeddableServices, AnomalyChartsApi, AnomalyChartsAttachmentApi } from '..';
export interface AnomalyChartsContainerProps extends Partial<AnomalyChartsEmbeddableOverridableState> {
    lastReloadRequestTime?: number;
    api: AnomalyChartsApi | AnomalyChartsAttachmentApi;
    id: string;
    services: AnomalyChartsEmbeddableServices;
    timeRange$: Observable<TimeRange | undefined>;
    onRenderComplete: () => void;
    onLoading: (v: boolean) => void;
    onError: (error: Error) => void;
    showFilterIcons?: boolean;
}
declare const AnomalyChartsContainer: FC<AnomalyChartsContainerProps>;
export default AnomalyChartsContainer;
