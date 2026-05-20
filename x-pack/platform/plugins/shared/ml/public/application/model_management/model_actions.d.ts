import type { Action } from '@elastic/eui/src/components/basic_table/action_types';
import type { DFAModelItem, TrainedModelItem, TrainedModelUIItem } from '@kbn/ml-common-types/trained_models';
export declare function useModelActions({ onDfaTestAction, onTestAction, onModelsDeleteRequest, onModelDeployRequest, onModelDownloadRequest, modelAndDeploymentIds, }: {
    onDfaTestAction: (model: DFAModelItem) => void;
    onTestAction: (model: TrainedModelItem) => void;
    onModelsDeleteRequest: (models: TrainedModelUIItem[]) => void;
    onModelDeployRequest: (model: DFAModelItem) => void;
    onModelDownloadRequest: (modelId: string) => void;
    modelAndDeploymentIds: string[];
}): Array<Action<TrainedModelUIItem>>;
