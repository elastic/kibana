import type { MemoryUsageUrlState, TrainedModelsUrlState } from '@kbn/ml-common-types/locator';
export declare function formatTrainedModelsManagementUrl(appBasePath: string, mlUrlGeneratorState: TrainedModelsUrlState['pageState']): string;
export declare function formatMemoryUsageUrl(appBasePath: string, mlUrlGeneratorState: MemoryUsageUrlState['pageState']): string;
