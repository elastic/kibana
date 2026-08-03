/**
 * Custom enum for DFA config types
 */
export declare const ANALYSIS_CONFIG_TYPE: {
    readonly OUTLIER_DETECTION: "outlier_detection";
    readonly REGRESSION: "regression";
    readonly CLASSIFICATION: "classification";
};
/**
 * Custom enum for DFA task states
 */
export declare const DATA_FRAME_TASK_STATE: {
    readonly ANALYZING: "analyzing";
    readonly FAILED: "failed";
    readonly REINDEXING: "reindexing";
    readonly STARTED: "started";
    readonly STARTING: "starting";
    readonly STOPPED: "stopped";
};
/**
 * Default results field
 */
export declare const DEFAULT_RESULTS_FIELD = "ml";
/**
 * Custom enum for job map node types for the DFA map view
 */
export declare const JOB_MAP_NODE_TYPES: {
    readonly ANALYTICS: "analytics";
    readonly ANALYTICS_JOB_MISSING: "analytics-job-missing";
    readonly TRANSFORM: "transform";
    readonly INDEX: "index";
    readonly TRAINED_MODEL: "trainedModel";
    readonly INGEST_PIPELINE: "ingestPipeline";
};
/**
 * Union type of JOB_MAP_NODE_TYPES
 */
export type JobMapNodeTypes = (typeof JOB_MAP_NODE_TYPES)[keyof typeof JOB_MAP_NODE_TYPES];
/**
 * Custom enum for the metadata to be stored about which tool was used to create an index
 */
export declare const INDEX_CREATED_BY: {
    readonly FILE_DATA_VISUALIZER: "file-data-visualizer";
    readonly DATA_FRAME_ANALYTICS: "data-frame-analytics";
};
/**
 * Feature importance constant
 */
export declare const FEATURE_IMPORTANCE = "feature_importance";
/**
 * Feature influence constant
 */
export declare const FEATURE_INFLUENCE = "feature_influence";
/**
 * Top classes constant
 */
export declare const TOP_CLASSES = "top_classes";
/**
 * Outlier score constant
 */
export declare const OUTLIER_SCORE = "outlier_score";
/**
 * Enum for a DFA configuration's advanced fields
 */
export declare enum ANALYSIS_ADVANCED_FIELDS {
    ALPHA = "alpha",
    ETA = "eta",
    ETA_GROWTH_RATE_PER_TREE = "eta_growth_rate_per_tree",
    DOWNSAMPLE_FACTOR = "downsample_factor",
    FEATURE_BAG_FRACTION = "feature_bag_fraction",
    FEATURE_INFLUENCE_THRESHOLD = "feature_influence_threshold",
    GAMMA = "gamma",
    LAMBDA = "lambda",
    MAX_TREES = "max_trees",
    MAX_OPTIMIZATION_ROUNDS_PER_HYPERPARAMETER = "max_optimization_rounds_per_hyperparameter",
    METHOD = "method",
    N_NEIGHBORS = "n_neighbors",
    NUM_TOP_CLASSES = "num_top_classes",
    NUM_TOP_FEATURE_IMPORTANCE_VALUES = "num_top_feature_importance_values",
    OUTLIER_FRACTION = "outlier_fraction",
    RANDOMIZE_SEED = "randomize_seed",
    SOFT_TREE_DEPTH_LIMIT = "soft_tree_depth_limit",
    SOFT_TREE_DEPTH_TOLERANCE = "soft_tree_depth_tolerance"
}
/**
 * Enum for a DFA configuration's outlier analysis method
 */
export declare enum OUTLIER_ANALYSIS_METHOD {
    LOF = "lof",
    LDOF = "ldof",
    DISTANCE_KTH_NN = "distance_kth_nn",
    DISTANCE_KNN = "distance_knn"
}
/**
 * Minimum value for feature importance
 */
export declare const NUM_TOP_FEATURE_IMPORTANCE_VALUES_MIN = 0;
/**
 * Minimum training percent
 */
export declare const TRAINING_PERCENT_MIN = 1;
/**
 * Maximum training percent
 */
export declare const TRAINING_PERCENT_MAX = 100;
