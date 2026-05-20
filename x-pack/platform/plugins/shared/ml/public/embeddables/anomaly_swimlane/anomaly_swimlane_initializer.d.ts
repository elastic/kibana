import { type FC } from 'react';
import type { AnomalySwimlaneEmbeddableUserInput, AnomalySwimlaneInitialInput } from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import type { MlApi } from '../../application/services/ml_api_service';
export type ExplicitInput = AnomalySwimlaneEmbeddableUserInput;
export interface AnomalySwimlaneInitializerProps {
    initialInput?: AnomalySwimlaneInitialInput;
    onCreate: (swimlaneProps: ExplicitInput) => void;
    onCancel: () => void;
    adJobsApiService: MlApi['jobs'];
}
export declare const AnomalySwimlaneInitializer: FC<AnomalySwimlaneInitializerProps>;
