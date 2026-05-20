import type { FC } from 'react';
import type { VectorLayerDescriptor } from '@kbn/maps-plugin/common';
import type { EMSTermJoinConfig } from '@kbn/maps-plugin/public';
import type { MlAnomaliesTableRecord } from '@kbn/ml-anomaly-utils';
export declare const getChoroplethAnomaliesLayer: (anomalies: MlAnomaliesTableRecord[], { layerId, field, jobId }: MLEMSTermJoinConfig) => VectorLayerDescriptor;
interface Props {
    anomalies: MlAnomaliesTableRecord[];
    jobIds: string[];
}
interface MLEMSTermJoinConfig extends EMSTermJoinConfig {
    jobId: string;
}
export declare const AnomaliesMap: FC<Props>;
export {};
