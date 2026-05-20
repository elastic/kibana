import type { estypes } from '@elastic/elasticsearch';
import type { trainedModelsApiProvider } from '../../../../services/ml_api_service/trained_models';
import { InferenceBase, INPUT_TYPE } from '../inference_base';
import type { InferResponse } from '../inference_base';
import type { ITelemetryClient } from '../../../../services/telemetry/types';
export type FormattedNerResponse = Array<{
    value: string;
    entity: estypes.MlTrainedModelEntities | null;
}>;
export type NerResponse = InferResponse<FormattedNerResponse, estypes.MlInferTrainedModelResponse>;
export declare class NerInference extends InferenceBase<NerResponse> {
    protected inferenceType: "ner";
    protected inferenceTypeLabel: string;
    protected info: string[];
    constructor(trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>, model: estypes.MlTrainedModelConfig, inputType: INPUT_TYPE, deploymentId: string, telemetryClient: ITelemetryClient);
    protected inferText(): Promise<NerResponse[]>;
    protected inferIndex(): Promise<NerResponse[]>;
    protected getProcessors(): estypes.IngestProcessorContainer[];
    getInputComponent(): JSX.Element | null;
    getOutputComponent(): JSX.Element;
}
