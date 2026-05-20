import type { MlInferenceState } from './types';
export declare function getPipelineConfig(state: MlInferenceState): {
    description: string;
    processors: {
        inference: {
            on_failure?: import("@elastic/elasticsearch/lib/api/types").IngestProcessorContainer[] | undefined;
            tag?: string | undefined;
            if?: string | undefined;
            inference_config?: ({
                regression?: import("@elastic/elasticsearch/lib/api/types").IngestInferenceConfigRegression | undefined;
            } & {
                classification?: undefined;
            }) | ({
                classification?: import("@elastic/elasticsearch/lib/api/types").IngestInferenceConfigClassification | undefined;
            } & {
                regression?: undefined;
            }) | undefined;
            field_map?: Record<string, any> | undefined;
            target_field?: string | undefined;
            model_id: string;
            ignore_failure: boolean;
        };
    }[];
};
