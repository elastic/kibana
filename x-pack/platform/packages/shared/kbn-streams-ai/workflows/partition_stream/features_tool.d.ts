import { resolveFeatureTypeFilters, toFeatureForLlmContext, type GetStreamFeaturesInput, type GetStreamFeaturesQuery, type LlmFeature } from '../../src/features/tool';
export declare const PARTITION_FEATURE_TOOL_TYPES: readonly ["entity"];
export type PartitionFeatureToolType = (typeof PARTITION_FEATURE_TOOL_TYPES)[number];
export declare const getFeatureTypesFromToolArgs: (toolArguments: unknown) => "entity"[] | undefined;
export declare const getFeatureQueryFromToolArgs: (toolArguments: unknown) => GetStreamFeaturesQuery<"entity">;
export declare const partitionStreamFeaturesTool: {
    description: string;
    schema: {
        type: "object";
        properties: {
            feature_types: {
                type: "array";
                items: {
                    type: "string";
                    enum: readonly "entity"[];
                };
            };
            min_confidence: {
                type: "number";
                minimum: number;
                maximum: number;
            };
            limit: {
                type: "number";
                minimum: number;
            };
        };
    };
};
export { resolveFeatureTypeFilters, toFeatureForLlmContext };
export type { GetStreamFeaturesInput, GetStreamFeaturesQuery, LlmFeature };
