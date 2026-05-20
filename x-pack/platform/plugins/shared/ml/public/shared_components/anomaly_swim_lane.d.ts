import type { KibanaExecutionContext } from '@kbn/core/public';
import type { AnomalySwimlaneProps as AnomalySwimlanePropsFromSchema } from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import { type FC } from 'react';
export interface AnomalySwimLaneProps extends AnomalySwimlanePropsFromSchema {
    executionContext: KibanaExecutionContext;
}
export declare const AnomalySwimLane: FC<AnomalySwimLaneProps>;
export default AnomalySwimLane;
