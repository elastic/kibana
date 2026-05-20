import type { estypes } from '@elastic/elasticsearch';
import type { InferResponse } from '../inference_base';
export interface InferenceResult {
    predicted_value: string;
    prediction_probability: number;
    top_classes?: Array<{
        class_name: string;
        class_probability: number;
        class_score: number;
    }>;
}
export interface RawTextClassificationResponse {
    inference_results: InferenceResult[];
}
export type FormattedTextClassificationResponse = Array<{
    value: string;
    predictionProbability: number;
}>;
export type TextClassificationResponse = InferResponse<FormattedTextClassificationResponse, RawTextClassificationResponse>;
export declare function processResponse(resp: RawTextClassificationResponse, model: estypes.MlTrainedModelConfig, inputText: string): TextClassificationResponse;
export declare function processInferenceResult(inferenceResult: InferenceResult, model: estypes.MlTrainedModelConfig): FormattedTextClassificationResponse;
