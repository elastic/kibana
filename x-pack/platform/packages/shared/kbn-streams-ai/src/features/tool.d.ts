import { type Feature } from '@kbn/streams-schema';
export interface GetStreamFeaturesInput {
    feature_types?: unknown;
    min_confidence?: unknown;
    limit?: unknown;
}
export interface GetStreamFeaturesQuery<T extends string = string> {
    featureTypes?: T[];
    minConfidence?: number;
    limit?: number;
}
export type LlmFeature = Pick<Feature, 'id' | 'type' | 'subtype' | 'title' | 'description' | 'confidence' | 'properties' | 'evidence' | 'tags' | 'meta' | 'filter'>;
export declare function resolveFeatureTypeFilters<T extends string>(featureTypes?: T[]): string[] | undefined;
export declare function createGetFeatureTypesFromToolArgs<T extends string>(allowedTypes: readonly T[]): (toolArguments: unknown) => T[] | undefined;
export declare function createGetFeatureQueryFromToolArgs<T extends string>(allowedTypes: readonly T[]): (toolArguments: unknown) => GetStreamFeaturesQuery<T>;
export declare function toFeatureForLlmContext(feature: Feature): LlmFeature;
export declare function createGetStreamFeaturesTool<T extends string>(allowedTypes: readonly T[]): {
    description: string;
    schema: {
        type: "object";
        properties: {
            feature_types: {
                type: "array";
                items: {
                    type: "string";
                    enum: readonly T[];
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
