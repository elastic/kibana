export declare const ML_PAGES: {
    readonly ANOMALY_DETECTION_JOBS_MANAGE: "";
    readonly ANOMALY_DETECTION_JOBS_MANAGE_FOR_URL: "jobs";
    readonly ANOMALY_EXPLORER: "explorer";
    readonly SINGLE_METRIC_VIEWER: "timeseriesexplorer";
    readonly DATA_FRAME_ANALYTICS_JOBS_MANAGE: "";
    readonly DATA_FRAME_ANALYTICS_JOBS_MANAGE_FOR_URL: "data_frame_analytics";
    readonly DATA_FRAME_ANALYTICS_SOURCE_SELECTION: "data_frame_analytics/source_selection";
    readonly DATA_FRAME_ANALYTICS_CREATE_JOB: "data_frame_analytics/new_job";
    readonly TRAINED_MODELS_MANAGE: "trained_models";
    readonly DATA_DRIFT_INDEX_SELECT: "data_drift_index_select";
    readonly DATA_DRIFT_CUSTOM: "data_drift_custom";
    readonly DATA_DRIFT: "data_drift";
    readonly NODES: "nodes";
    readonly MEMORY_USAGE: "memory_usage";
    readonly DATA_FRAME_ANALYTICS_EXPLORATION: "data_frame_analytics/exploration";
    readonly DATA_FRAME_ANALYTICS_MAP: "data_frame_analytics/map";
    readonly SUPPLIED_CONFIGURATIONS: "ad_supplied_configurations";
    /**
     * Page: Data Visualizer
     */
    readonly DATA_VISUALIZER: "datavisualizer";
    /**
     * Page: Data Visualizer
     * Open data visualizer by selecting a Kibana data view or saved search
     */
    readonly DATA_VISUALIZER_INDEX_SELECT: "datavisualizer_index_select";
    /**
     * Page: Data Visualizer
     * Open data visualizer by importing data from a log file
     */
    readonly DATA_VISUALIZER_FILE: "filedatavisualizer";
    /**
     * Page: Data Visualizer
     * Open index data visualizer viewer page
     */
    readonly DATA_VISUALIZER_ESQL: "datavisualizer/esql";
    readonly DATA_VISUALIZER_INDEX_VIEWER: "jobs/new_job/datavisualizer";
    readonly ANOMALY_DETECTION_CREATE_JOB: "jobs/new_job";
    readonly ANOMALY_DETECTION_CREATE_JOB_RECOGNIZER: "jobs/new_job/recognize";
    readonly ANOMALY_DETECTION_CREATE_JOB_SINGLE_METRIC: "jobs/new_job/single_metric";
    readonly ANOMALY_DETECTION_CREATE_JOB_MULTI_METRIC: "jobs/new_job/multi_metric";
    readonly ANOMALY_DETECTION_CREATE_JOB_CONVERT_TO_MULTI_METRIC: "jobs/new_job/convert_to_multi_metric";
    readonly ANOMALY_DETECTION_CREATE_JOB_ADVANCED: "jobs/new_job/advanced";
    readonly ANOMALY_DETECTION_CREATE_JOB_POPULATION: "jobs/new_job/population";
    readonly ANOMALY_DETECTION_CREATE_JOB_CATEGORIZATION: "jobs/new_job/categorization";
    readonly ANOMALY_DETECTION_CREATE_JOB_RARE: "jobs/new_job/rare";
    readonly ANOMALY_DETECTION_CREATE_JOB_GEO: "jobs/new_job/geo";
    readonly ANOMALY_DETECTION_CREATE_JOB_CONVERT_TO_ADVANCED: "jobs/new_job/advanced";
    readonly ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE: "jobs/new_job/step/job_type";
    readonly ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX: "jobs/new_job/step/select_source";
    readonly ANOMALY_DETECTION_CREATE_JOB_FROM_LENS: "jobs/new_job/from_lens";
    readonly ANOMALY_DETECTION_CREATE_JOB_FROM_PATTERN_ANALYSIS: "jobs/new_job/from_pattern_analysis";
    readonly ANOMALY_DETECTION_CREATE_JOB_FROM_MAP: "jobs/new_job/from_map";
    readonly ANOMALY_DETECTION_MODULES_VIEW_OR_CREATE: "modules/check_view_or_create";
    readonly SETTINGS: "";
    readonly CALENDARS_MANAGE: "calendars_list";
    readonly CALENDARS_DST_MANAGE: "calendars_dst_list";
    readonly CALENDARS_NEW: "calendars_list/new_calendar";
    readonly CALENDARS_DST_NEW: "calendars_dst_list/new_calendar";
    readonly CALENDARS_EDIT: "calendars_list/edit_calendar";
    readonly CALENDARS_DST_EDIT: "calendars_dst_list/edit_calendar";
    readonly FILTER_LISTS_MANAGE: "filter_lists";
    readonly FILTER_LISTS_NEW: "filter_lists/new_filter_list";
    readonly FILTER_LISTS_EDIT: "filter_lists/edit_filter_list";
    readonly OVERVIEW: "overview";
    readonly NOTIFICATIONS: "notifications";
    readonly AIOPS: "aiops";
    /**
     * @deprecated since 8.10, kept here to redirect old bookmarks.
     */
    readonly AIOPS_EXPLAIN_LOG_RATE_SPIKES: "aiops/explain_log_rate_spikes";
    /**
     * @deprecated since 8.10, kept here to redirect old bookmarks.
     */
    readonly AIOPS_EXPLAIN_LOG_RATE_SPIKES_INDEX_SELECT: "aiops/explain_log_rate_spikes_index_select";
    readonly AIOPS_LOG_RATE_ANALYSIS: "aiops/log_rate_analysis";
    readonly AIOPS_LOG_RATE_ANALYSIS_INDEX_SELECT: "aiops/log_rate_analysis_index_select";
    readonly AIOPS_LOG_CATEGORIZATION: "aiops/log_categorization";
    readonly AIOPS_LOG_CATEGORIZATION_INDEX_SELECT: "aiops/log_categorization_index_select";
    readonly AIOPS_CHANGE_POINT_DETECTION: "aiops/change_point_detection";
    readonly AIOPS_CHANGE_POINT_DETECTION_INDEX_SELECT: "aiops/change_point_detection_index_select";
};
export type MlPages = (typeof ML_PAGES)[keyof typeof ML_PAGES];
