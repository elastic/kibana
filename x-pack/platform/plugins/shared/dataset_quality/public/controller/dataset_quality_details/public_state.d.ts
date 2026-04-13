import type { DatasetQualityDetailsControllerContext } from '../../state_machines/dataset_quality_details_controller';
import type { DatasetQualityDetailsPublicState, DatasetQualityDetailsPublicStateUpdate } from './types';
export declare const getPublicStateFromContext: (context: DatasetQualityDetailsControllerContext) => DatasetQualityDetailsPublicState;
export declare const getContextFromPublicState: (publicState: DatasetQualityDetailsPublicStateUpdate) => DatasetQualityDetailsControllerContext;
