import type { UnifiedValueAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React from 'react';
export declare const initComponent: ((fieldFormats: FieldFormatsStart) => React.MemoExoticComponent<(props: UnifiedValueAttachmentViewProps) => React.JSX.Element>) & import("lodash").MemoizedFunction;
