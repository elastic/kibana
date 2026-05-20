import { resolveFeatureTypeFilters, toFeatureForLlmContext, type GetStreamFeaturesInput, type GetStreamFeaturesQuery, type LlmFeature } from '../../features/tool';
export declare const SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES: readonly ["entity", "infrastructure", "technology", "dependency", "schema", "dataset_analysis", "log_samples", "log_patterns", "error_logs"];
export type SignificantEventsFeatureToolType = (typeof SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES)[number];
export declare const getFeatureTypesFromToolArgs: (toolArguments: unknown) => ("schema" | "entity" | "infrastructure" | "dependency" | "dataset_analysis" | "log_samples" | "log_patterns" | "error_logs" | "technology")[] | undefined;
export declare const getFeatureQueryFromToolArgs: (toolArguments: unknown) => GetStreamFeaturesQuery<"schema" | "entity" | "infrastructure" | "dependency" | "dataset_analysis" | "log_samples" | "log_patterns" | "error_logs" | "technology">;
export { resolveFeatureTypeFilters, toFeatureForLlmContext };
export type { GetStreamFeaturesInput, GetStreamFeaturesQuery, LlmFeature };
