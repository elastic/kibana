import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React from 'react';
import type { UnifiedValueAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import type { PatternAnalysisSharedComponent } from '../shared_components/pattern_analysis';
export declare const initComponent: ((fieldFormats: FieldFormatsStart, PatternAnalysisComponent: PatternAnalysisSharedComponent) => React.MemoExoticComponent<(props: UnifiedValueAttachmentViewProps) => React.JSX.Element>) & import("lodash").MemoizedFunction;
