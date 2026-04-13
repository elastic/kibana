import type { DatasetQualityControllerContext } from '../../state_machines/dataset_quality_controller';
import type { DatasetQualityPublicState, DatasetQualityPublicStateUpdate } from './types';
export declare const getPublicStateFromContext: (context: DatasetQualityControllerContext) => DatasetQualityPublicState;
export declare const getContextFromPublicState: (publicState: DatasetQualityPublicStateUpdate) => DatasetQualityControllerContext;
