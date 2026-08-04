import React from 'react';
import type { CommonAttachmentTabViewProps } from '../../../../client/attachment_framework/types';
import type { SavedObjectAttachmentsTableProps } from './saved_object_attachments_table';
type StaticTabProps = Pick<SavedObjectAttachmentsTableProps, 'attachmentTypeId' | 'soType'>;
/**
 * Factory that returns the `children` component for an SO-typed attachment's
 * tab view (`getAttachmentTabViewObject`). Defers the table chunk
 * (`EuiInMemoryTable` + helpers, ~5 KB compressed) behind a `React.lazy` +
 * `Suspense` boundary so it isn't paid on the eager `cases` page-load bundle.
 *
 * Each attachment type (dashboard / map / discoverSession) bakes in its own
 * constants (`attachmentTypeId`, `soType`) at registration time and passes
 * only the framework-provided per-render props (`caseData`, `searchTerm`).
 */
export declare const createSavedObjectAttachmentsTab: ({ attachmentTypeId, soType, }: StaticTabProps) => React.FC<CommonAttachmentTabViewProps>;
export {};
