export interface SigEventsTuningConfig {
    sample_size: number;
    max_iterations: number;
    feature_ttl_days: number;
    entity_filtered_ratio: number;
    diverse_ratio: number;
    max_excluded_features_in_prompt: number;
    max_entity_filters: number;
    semantic_min_score: number;
    rrf_rank_constant: number;
}
export declare const DEFAULT_SIG_EVENTS_TUNING_CONFIG: SigEventsTuningConfig;
