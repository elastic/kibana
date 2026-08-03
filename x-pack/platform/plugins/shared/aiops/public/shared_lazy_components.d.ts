import type { FC } from 'react';
import type { LogRateAnalysisAppStateProps } from './components/log_rate_analysis';
import type { LogRateAnalysisContentWrapperProps } from './components/log_rate_analysis/log_rate_analysis_content/log_rate_analysis_content_wrapper';
import type { LogCategorizationAppStateProps } from './components/log_categorization';
import type { LogCategorizationEmbeddableWrapperProps } from './components/log_categorization/log_categorization_for_embeddable/log_categorization_for_discover_wrapper';
import type { ChangePointDetectionAppStateProps } from './components/change_point_detection';
/**
 * Lazy-wrapped LogRateAnalysisAppState React component
 * @param {LogRateAnalysisAppStateProps}  props - properties specifying the data on which to run the analysis.
 */
export declare const LogRateAnalysis: FC<LogRateAnalysisAppStateProps>;
/**
 * Lazy-wrapped LogRateAnalysisContentWrapperReact component
 * @param {LogRateAnalysisContentWrapperProps}  props - properties specifying the data on which to run the analysis.
 */
export declare const LogRateAnalysisContent: FC<LogRateAnalysisContentWrapperProps>;
/**
 * Lazy-wrapped LogCategorizationAppStateProps React component
 * @param {LogCategorizationAppStateProps}  props - properties specifying the data on which to run the analysis.
 */
export declare const LogCategorization: FC<LogCategorizationAppStateProps>;
/**
 * Lazy-wrapped LogCategorizationForDiscover React component
 * @param {LogCategorizationEmbeddableWrapperProps}  props - properties specifying the data on which to run the analysis.
 */
export declare const LogCategorizationForDiscover: FC<LogCategorizationEmbeddableWrapperProps>;
/**
 * Lazy-wrapped ChangePointDetectionAppStateProps React component
 * @param {ChangePointDetectionAppStateProps}  props - properties specifying the data on which to run the analysis.
 */
export declare const ChangePointDetection: FC<ChangePointDetectionAppStateProps>;
