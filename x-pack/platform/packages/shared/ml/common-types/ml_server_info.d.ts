import type { estypes } from '@elastic/elasticsearch';
export interface CloudInfo {
    cloudId: string | null;
    isCloud: boolean;
    isCloudTrial: boolean;
    deploymentId: string | null;
    cloudUrl: string | null;
    isMlAutoscalingEnabled: boolean;
}
export interface MlServerDefaults {
    anomaly_detectors: {
        categorization_examples_limit?: number;
        model_memory_limit?: string;
        model_snapshot_retention_days?: number;
        categorization_analyzer?: estypes.MlCategorizationAnalyzerDefinition;
    };
    datafeeds: {
        scroll_size?: number;
    };
}
export interface MlServerLimits {
    max_model_memory_limit?: string;
    effective_max_model_memory_limit?: string;
    max_single_ml_node_processors?: number;
    total_ml_processors?: number;
}
export interface MlInfoResponse {
    defaults: MlServerDefaults;
    limits: MlServerLimits;
    native_code: {
        build_hash: string;
        version: string;
    };
    upgrade_mode: boolean;
    cloudId?: string;
}
export interface MlNodeCount {
    count: number;
    lazyNodeCount: number;
}
