import type { estypes } from '@elastic/elasticsearch';
import type { trainedModelsApiProvider } from '../../../../services/ml_api_service/trained_models';
import type { INPUT_TYPE } from '../inference_base';
import { InferenceBase } from '../inference_base';
import type { TextClassificationResponse } from './common';
import type { ITelemetryClient } from '../../../../services/telemetry/types';
export declare class ZeroShotClassificationInference extends InferenceBase<TextClassificationResponse> {
    protected inferenceType: "zero_shot_classification";
    protected inferenceTypeLabel: string;
    protected info: string[];
    private labelsText$;
    private multiLabel$;
    constructor(trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>, model: estypes.MlTrainedModelConfig, inputType: INPUT_TYPE, deploymentId: string, telemetryClient: ITelemetryClient);
    inferText(): Promise<TextClassificationResponse[]>;
    protected inferIndex(): Promise<TextClassificationResponse[]>;
    private getInputLabels;
    protected getProcessors(): estypes.IngestProcessorContainer[];
    setLabelsText(text: string): void;
    getLabelsText$(): import("rxjs").Observable<string>;
    getLabelsText(): string;
    setMultiLabel(multiLabel: boolean): void;
    getMultiLabel$(): import("rxjs").Observable<boolean>;
    getMultiLabel(): boolean;
    getInputComponent(): JSX.Element;
    getOutputComponent(): JSX.Element;
}
