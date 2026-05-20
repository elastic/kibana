import type { estypes } from '@elastic/elasticsearch';
import { InferenceBase } from '../inference_base';
import type { InferResponse , INPUT_TYPE } from '../inference_base';
import type { trainedModelsApiProvider } from '../../../../services/ml_api_service/trained_models';
import type { ITelemetryClient } from '../../../../services/telemetry/types';
export interface RawTextEmbeddingResponse {
    inference_results: Array<{
        predicted_value: number[];
    }>;
}
export interface FormattedTextEmbeddingResponse {
    predictedValue: number[];
}
export type TextEmbeddingResponse = InferResponse<FormattedTextEmbeddingResponse, RawTextEmbeddingResponse>;
export declare class TextEmbeddingInference extends InferenceBase<TextEmbeddingResponse> {
    protected inferenceType: "text_embedding";
    protected inferenceTypeLabel: string;
    protected info: string[];
    constructor(trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>, model: estypes.MlTrainedModelConfig, inputType: INPUT_TYPE, deploymentId: string, telemetryClient: ITelemetryClient);
    inferText(): Promise<TextEmbeddingResponse[]>;
    protected inferIndex(): Promise<TextEmbeddingResponse[]>;
    protected getProcessors(): estypes.IngestProcessorContainer[];
    getInputComponent(): JSX.Element | null;
    getOutputComponent(): JSX.Element;
}
