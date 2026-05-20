import React from 'react';
import type { UnifiedValueAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { AnomalyChartsEmbeddableServices } from '../embeddables';
export declare const initializeAnomalyChartsAttachment: ((fieldFormats: FieldFormatsStart, services: AnomalyChartsEmbeddableServices) => React.MemoExoticComponent<(props: UnifiedValueAttachmentViewProps) => React.JSX.Element>) & import("lodash").MemoizedFunction;
