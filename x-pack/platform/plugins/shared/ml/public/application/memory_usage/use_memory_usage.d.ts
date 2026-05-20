import type { MlSavedObjectType } from '@kbn/ml-common-types/saved_objects';
import type { MemoryUsageInfo } from '@kbn/ml-common-types/trained_models';
export declare const useMemoryUsage: (node?: string, type?: MlSavedObjectType) => {
    loading: boolean;
    data: MemoryUsageInfo[];
    error: string | undefined;
};
