import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React from 'react';
import type { UnifiedValueAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import type { ChangePointDetectionSharedComponent } from '../shared_components/change_point_detection';
export declare const initComponent: ((fieldFormats: FieldFormatsStart, ChangePointDetectionComponent: ChangePointDetectionSharedComponent) => React.MemoExoticComponent<(props: UnifiedValueAttachmentViewProps) => React.JSX.Element>) & import("lodash").MemoizedFunction;
