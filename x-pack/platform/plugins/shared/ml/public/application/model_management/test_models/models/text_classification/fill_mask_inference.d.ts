import type { estypes } from '@elastic/elasticsearch';
import type { INPUT_TYPE } from '../inference_base';
import { InferenceBase } from '../inference_base';
import type { TextClassificationResponse } from './common';
import type { trainedModelsApiProvider } from '../../../../services/ml_api_service/trained_models';
import type { ITelemetryClient } from '../../../../services/telemetry/types';
export declare class FillMaskInference extends InferenceBase<TextClassificationResponse> {
    protected inferenceType: "fill_mask";
    protected inferenceTypeLabel: string;
    protected info: string[];
    private maskToken;
    constructor(trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>, model: estypes.MlTrainedModelConfig, inputType: INPUT_TYPE, deploymentId: string, telemetryClient: ITelemetryClient);
    protected inferText(): Promise<TextClassificationResponse[]>;
    protected inferIndex(): Promise<TextClassificationResponse[]>;
    protected getProcessors(): estypes.IngestProcessorContainer[];
    predictedValue(resp: TextClassificationResponse): string;
    getInputComponent(): JSX.Element | null;
    getOutputComponent(): JSX.Element;
}
