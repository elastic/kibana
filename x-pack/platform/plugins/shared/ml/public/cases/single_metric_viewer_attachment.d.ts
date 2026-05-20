import type { UnifiedValueAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React from 'react';
import type { SingleMetricViewerSharedComponent } from '../shared_components/single_metric_viewer';
export declare const initComponent: ((fieldFormats: FieldFormatsStart, SingleMetricViewerComponent: SingleMetricViewerSharedComponent) => React.MemoExoticComponent<(props: UnifiedValueAttachmentViewProps) => React.JSX.Element>) & import("lodash").MemoizedFunction;
