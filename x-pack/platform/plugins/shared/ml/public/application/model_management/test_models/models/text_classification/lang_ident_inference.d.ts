import type { estypes } from '@elastic/elasticsearch';
import { InferenceBase, INPUT_TYPE } from '../inference_base';
import type { InferenceType } from '../inference_base';
import type { TextClassificationResponse } from './common';
import type { trainedModelsApiProvider } from '../../../../services/ml_api_service/trained_models';
import type { ITelemetryClient } from '../../../../services/telemetry/types';
export declare class LangIdentInference extends InferenceBase<TextClassificationResponse> {
    protected inferenceType: InferenceType;
    protected inferenceTypeLabel: string;
    protected info: string[];
    constructor(trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>, model: estypes.MlTrainedModelConfig, inputType: INPUT_TYPE, deploymentId: string, telemetryClient: ITelemetryClient);
    inferText(): Promise<TextClassificationResponse[]>;
    protected inferIndex(): Promise<TextClassificationResponse[]>;
    protected getProcessors(): estypes.IngestProcessorContainer[];
    getInputComponent(): JSX.Element | null;
    getOutputComponent(): JSX.Element;
}
