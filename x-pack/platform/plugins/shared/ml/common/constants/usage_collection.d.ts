export declare const ML_USAGE_EVENT: {
    readonly IMPORTED_ANOMALY_DETECTOR_JOBS: "imported_anomaly_detector_jobs";
    readonly IMPORT_FAILED_ANOMALY_DETECTOR_JOBS: "import_failed_anomaly_detector_jobs";
    readonly IMPORTED_DATA_FRAME_ANALYTICS_JOBS: "imported_data_frame_analytics_jobs";
    readonly IMPORT_FAILED_DATA_FRAME_ANALYTICS_JOBS: "import_failed_data_frame_analytics_jobs";
    readonly EXPORTED_ANOMALY_DETECTOR_JOBS: "exported_anomaly_detector_jobs";
    readonly EXPORTED_DATA_FRAME_ANALYTICS_JOBS: "exported_data_frame_analytics_jobs";
};
export type MlUsageEvent = (typeof ML_USAGE_EVENT)[keyof typeof ML_USAGE_EVENT];
export type CustomRuleEditorSource = 'explorer_anomalies_table' | 'explorer_single_metric_chart' | 'explorer_distribution_chart' | 'single_metric_viewer_anomalies_table' | 'single_metric_viewer_chart' | 'embeddable_single_metric_chart' | 'embeddable_distribution_chart' | 'embeddable_single_metric_viewer_chart';
