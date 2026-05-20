import type { estypes } from '@elastic/elasticsearch';
import { InferenceBase } from '../inference_base';
import type { InferResponse, INPUT_TYPE } from '../inference_base';
import type { trainedModelsApiProvider } from '../../../../services/ml_api_service/trained_models';
import type { ITelemetryClient } from '../../../../services/telemetry/types';
export interface RawQuestionAnsweringResponse {
    inference_results: Array<{
        predicted_value: string;
        prediction_probability: number;
        start_offset: number;
        end_offset: number;
        top_classes?: Array<{
            end_offset: number;
            score: number;
            start_offset: number;
            answer: string;
        }>;
    }>;
}
export interface FormattedQuestionAnsweringResult {
    value: string;
    predictionProbability: number;
    startOffset: number;
    endOffset: number;
}
export type FormattedQuestionAnsweringResponse = FormattedQuestionAnsweringResult[];
export type QuestionAnsweringResponse = InferResponse<FormattedQuestionAnsweringResponse, RawQuestionAnsweringResponse>;
export declare class QuestionAnsweringInference extends InferenceBase<QuestionAnsweringResponse> {
    protected inferenceType: "question_answering";
    protected inferenceTypeLabel: string;
    protected info: string[];
    private questionText$;
    constructor(trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>, model: estypes.MlTrainedModelConfig, inputType: INPUT_TYPE, deploymentId: string, telemetryClient: ITelemetryClient);
    inferText(): Promise<QuestionAnsweringResponse[]>;
    protected inferIndex(): Promise<QuestionAnsweringResponse[]>;
    protected getProcessors(): estypes.IngestProcessorContainer[];
    setQuestionText(text: string): void;
    getQuestionText$(): import("rxjs").Observable<string>;
    getQuestionText(): string;
    getInputComponent(): JSX.Element;
    getOutputComponent(): JSX.Element;
}
