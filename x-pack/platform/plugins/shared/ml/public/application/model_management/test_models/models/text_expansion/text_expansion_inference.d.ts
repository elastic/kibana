import type { estypes } from '@elastic/elasticsearch';
import type { trainedModelsApiProvider } from '../../../../services/ml_api_service/trained_models';
import type { INPUT_TYPE } from '../inference_base';
import { InferenceBase, type InferResponse } from '../inference_base';
import type { ITelemetryClient } from '../../../../services/telemetry/types';
export interface TextExpansionPair {
    token: string;
    value: number;
}
export interface FormattedTextExpansionResponse {
    text: string;
    score: number;
    originalTokenWeights: TextExpansionPair[];
    adjustedTokenWeights: TextExpansionPair[];
}
export type TextExpansionResponse = InferResponse<FormattedTextExpansionResponse, estypes.MlInferTrainedModelResponse>;
export declare class TextExpansionInference extends InferenceBase<TextExpansionResponse> {
    protected inferenceType: "text_expansion";
    protected inferenceTypeLabel: string;
    protected info: string[];
    private queryText$;
    private queryResults;
    constructor(trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>, model: estypes.MlTrainedModelConfig, inputType: INPUT_TYPE, deploymentId: string, telemetryClient: ITelemetryClient);
    protected inferText(): Promise<TextExpansionResponse[]>;
    protected inferIndex(): Promise<TextExpansionResponse[]>;
    protected getProcessors(): estypes.IngestProcessorContainer[];
    setQueryText(text: string): void;
    getQueryText$(): import("rxjs").Observable<string>;
    getQueryText(): string;
    getInputComponent(): JSX.Element | null;
    getOutputComponent(): JSX.Element;
}
