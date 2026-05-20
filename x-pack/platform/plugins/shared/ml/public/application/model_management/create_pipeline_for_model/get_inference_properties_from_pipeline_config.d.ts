import type { estypes } from '@elastic/elasticsearch';
import type { IngestInferenceProcessor, IngestInferenceConfig } from '@elastic/elasticsearch/lib/api/types';
interface MLIngestInferenceProcessor extends IngestInferenceProcessor {
    inference_config: MLInferencePipelineInferenceConfig;
}
type MLInferencePipelineInferenceConfig = IngestInferenceConfig & {
    zero_shot_classification?: estypes.MlZeroShotClassificationInferenceOptions;
    question_answering?: estypes.MlQuestionAnsweringInferenceUpdateOptions;
};
interface GetInferencePropertiesFromPipelineConfigReturnType {
    inputField: string;
    inferenceConfig?: MLInferencePipelineInferenceConfig;
    inferenceObj?: IngestInferenceProcessor | MLIngestInferenceProcessor;
    fieldMap?: IngestInferenceProcessor['field_map'];
    labels?: string[];
    multi_label?: boolean;
    question?: string;
}
export declare function isMlInferencePipelineInferenceConfig(arg: unknown): arg is MLInferencePipelineInferenceConfig;
export declare function isMlIngestInferenceProcessor(arg: unknown): arg is MLIngestInferenceProcessor;
export declare function getInferencePropertiesFromPipelineConfig(type: string, pipelineConfig: estypes.IngestPipeline): GetInferencePropertiesFromPipelineConfigReturnType;
export {};
