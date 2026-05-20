import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { estypes } from '@elastic/elasticsearch';
import type { SupportedPytorchTasksType } from '@kbn/ml-trained-models-utils';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { MLHttpFetchError } from '@kbn/ml-error-utils';
import type { trainedModelsApiProvider } from '../../../services/ml_api_service/trained_models';
import type { ITelemetryClient } from '../../../services/telemetry/types';
export type InferenceType = SupportedPytorchTasksType | keyof NonNullable<estypes.AggregationsInferenceConfigContainer>;
export type InferenceOptions = estypes.MlRegressionInferenceOptions | estypes.MlClassificationInferenceOptions | estypes.MlTextClassificationInferenceOptions | estypes.MlZeroShotClassificationInferenceOptions | estypes.MlFillMaskInferenceOptions | estypes.MlNerInferenceOptions | estypes.MlPassThroughInferenceOptions | estypes.MlTextEmbeddingInferenceOptions | estypes.MlQuestionAnsweringInferenceUpdateOptions;
export declare const DEFAULT_INPUT_FIELD = "text_field";
export declare const DEFAULT_INFERENCE_TIME_OUT = "30s";
export type FormattedNerResponse = Array<{
    value: string;
    entity: estypes.MlTrainedModelEntities | null;
}>;
export interface InferResponse<T, U> {
    inputText: string;
    response: T;
    rawResponse: U;
}
export declare enum RUNNING_STATE {
    STOPPED = 0,
    RUNNING = 1,
    FINISHED = 2,
    FINISHED_WITH_ERRORS = 3
}
export declare enum INPUT_TYPE {
    TEXT = 0,
    INDEX = 1
}
export declare abstract class InferenceBase<TInferResponse> {
    protected readonly trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>;
    protected readonly model: estypes.MlTrainedModelConfig;
    protected readonly inputType: INPUT_TYPE;
    protected readonly deploymentId: string;
    private readonly telemetryClient;
    protected abstract readonly inferenceType: InferenceType;
    protected abstract readonly inferenceTypeLabel: string;
    protected readonly modelInputField: string;
    protected _deploymentId: string | null;
    protected inputText$: BehaviorSubject<string[]>;
    private inputField$;
    private inferenceResult$;
    private inferenceError$;
    private runningState$;
    private isValid$;
    private pipeline$;
    private supportedFieldTypes;
    private selectedDataViewId;
    protected readonly info: string[];
    switchToCreationMode?: () => void;
    private subscriptions$;
    constructor(trainedModelsApi: ReturnType<typeof trainedModelsApiProvider>, model: estypes.MlTrainedModelConfig, inputType: INPUT_TYPE, deploymentId: string, telemetryClient: ITelemetryClient);
    setSwitchtoCreationMode(callback: () => void): void;
    destroy(): void;
    protected initialize(additionalValidators?: Array<Observable<boolean>>, additionalChanges?: Array<Observable<unknown>>): void;
    private initializeValidators;
    private initializePipeline;
    setStopped(): void;
    setRunning(): void;
    setFinished(): void;
    setFinishedWithErrors(error: MLHttpFetchError): void;
    getInfoComponent(): JSX.Element;
    getInputType(): INPUT_TYPE;
    reset(): void;
    setSelectedDataViewId(dataViewId: string): void;
    getSelectedDataViewId(): string | undefined;
    setInputField(field: string | undefined): void;
    getInputField(): string;
    getInputField$(): Observable<string>;
    setInputText(text: string[]): void;
    getInputText$(): Observable<string[]>;
    getInputText(): string[];
    getInferenceResult$(): Observable<TInferResponse[] | null>;
    getInferenceResult(): TInferResponse[] | null;
    getInferenceError$(): Observable<MLHttpFetchError | null>;
    getInferenceError(): MLHttpFetchError | null;
    getRunningState$(): Observable<RUNNING_STATE>;
    getRunningState(): RUNNING_STATE;
    getIsValid$(): Observable<boolean>;
    getIsValid(): boolean;
    protected abstract getInputComponent(): JSX.Element | null;
    protected abstract getOutputComponent(): JSX.Element;
    infer(): Promise<TInferResponse[]>;
    protected abstract inferText(): Promise<TInferResponse[]>;
    protected abstract inferIndex(): Promise<TInferResponse[]>;
    generatePipeline(): estypes.IngestPipeline;
    getPipeline$(): Observable<estypes.IngestPipeline>;
    getPipeline(): estypes.IngestPipeline;
    getSupportedFieldTypes(): ES_FIELD_TYPES[];
    protected getBasicProcessors(inferenceConfigOverrides?: InferenceOptions): estypes.IngestProcessorContainer[];
    protected getInferenceConfig(inferenceConfigOverrides: InferenceOptions): estypes.MlInferenceConfigUpdateContainer;
    protected runInfer<TRawInferResponse>(getInferenceConfig: () => estypes.MlInferenceConfigUpdateContainer | void, processResponse: (resp: TRawInferResponse, inputText: string) => TInferResponse): Promise<TInferResponse[]>;
    protected runPipelineSimulate(processResponse: (d: estypes.IngestDocumentSimulation) => TInferResponse): Promise<TInferResponse[]>;
    protected abstract getProcessors(): estypes.IngestProcessorContainer[];
    protected getInferDocs(): {
        [x: string]: string;
    }[];
    protected getPipelineDocs(): {
        _source: {
            [x: string]: string;
        };
    }[];
    private getDefaultInferenceConfig;
    protected getNumTopClassesConfig(defaultOverride?: number): {
        num_top_classes?: undefined;
    } | {
        num_top_classes: number;
    };
    protected getDocFromResponse({ doc, error }: estypes.IngestSimulateDocumentResult): estypes.IngestDocumentSimulation;
    private trackModelTested;
}
