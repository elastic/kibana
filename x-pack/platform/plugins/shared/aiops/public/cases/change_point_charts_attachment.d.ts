import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React from 'react';
import type { UnifiedValueAttachmentViewProps } from '@kbn/cases-plugin/public';
import type { ChangePointChartAttachmentData } from '../../common/utils';
import type { ChangePointDetectionSharedComponent } from '../shared_components/change_point_detection';
type ChangePointChartViewProps = UnifiedValueAttachmentViewProps<ChangePointChartAttachmentData>;
export declare const initComponent: ((fieldFormats: FieldFormatsStart, ChangePointDetectionComponent: ChangePointDetectionSharedComponent) => React.MemoExoticComponent<(props: ChangePointChartViewProps) => React.JSX.Element>) & import("lodash").MemoizedFunction;
export {};
