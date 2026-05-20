import type { FC } from 'react';
import type { NodeDeploymentStatsResponse } from '@kbn/ml-common-types/trained_models';
interface MemoryPreviewChartProps {
    memoryOverview: NodeDeploymentStatsResponse['memory_overview'];
}
export declare const MemoryPreviewChart: FC<MemoryPreviewChartProps>;
export {};
