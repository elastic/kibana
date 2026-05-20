import type { TrainedModelsService } from '../trained_models_service';
/**
 * Hook that initializes the shared TrainedModelsService instance with storage
 * for tracking active operations. The service is destroyed when no components
 * are using it and all operations are complete.
 */
export declare function useInitTrainedModelsService(): TrainedModelsService;
