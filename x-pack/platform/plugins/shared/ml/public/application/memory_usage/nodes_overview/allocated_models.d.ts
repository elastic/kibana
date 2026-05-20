import type { FC } from 'react';
import type { NodeDeploymentStatsResponse } from '@kbn/ml-common-types/trained_models';
interface AllocatedModelsProps {
    models: NodeDeploymentStatsResponse['allocated_models'];
    hideColumns?: string[];
}
export declare const AllocatedModels: FC<AllocatedModelsProps>;
export {};
