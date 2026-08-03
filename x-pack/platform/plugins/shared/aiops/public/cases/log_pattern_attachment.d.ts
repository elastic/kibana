import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React from 'react';
import type { UnifiedValueAttachmentViewProps } from '@kbn/cases-plugin/public';
import type { PatternAnalysisAttachmentData } from '../../common/utils';
import type { PatternAnalysisSharedComponent } from '../shared_components/pattern_analysis';
type PatternAnalysisViewProps = UnifiedValueAttachmentViewProps<PatternAnalysisAttachmentData>;
export declare const initComponent: ((fieldFormats: FieldFormatsStart, PatternAnalysisComponent: PatternAnalysisSharedComponent) => React.MemoExoticComponent<(props: PatternAnalysisViewProps) => React.JSX.Element>) & import("lodash").MemoizedFunction;
export {};
