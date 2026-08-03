import React from 'react';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { UnifiedValueAttachmentViewProps } from '@kbn/cases-plugin/public';
import type { LogRateAnalysisAttachmentData } from '../../common/utils';
import type { LogRateAnalysisEmbeddableWrapper } from '../shared_components/log_rate_analysis_embeddable_wrapper';
type LogRateAnalysisViewProps = UnifiedValueAttachmentViewProps<LogRateAnalysisAttachmentData>;
export declare const initComponent: ((fieldFormats: FieldFormatsStart, LogRateAnalysisComponent: LogRateAnalysisEmbeddableWrapper) => React.MemoExoticComponent<(props: LogRateAnalysisViewProps) => React.JSX.Element>) & import("lodash").MemoizedFunction;
export {};
