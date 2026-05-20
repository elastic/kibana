import type { AnalyticsJobType } from '../pages/analytics_management/hooks/use_create_analytics_form/state';
export declare const getScatterplotMatrixLegendType: (jobType: AnalyticsJobType | "unknown") => "nominal" | "quantitative" | undefined;
