import React from 'react';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { UnifiedValueAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import type { LogRateAnalysisEmbeddableWrapper } from '../shared_components/log_rate_analysis_embeddable_wrapper';
export declare const initComponent: ((fieldFormats: FieldFormatsStart, LogRateAnalysisComponent: LogRateAnalysisEmbeddableWrapper) => React.MemoExoticComponent<(props: UnifiedValueAttachmentViewProps) => React.JSX.Element>) & import("lodash").MemoizedFunction;
