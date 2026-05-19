import React from 'react';
import type { UnifiedReferenceAttachmentViewProps } from '../../../client/attachment_framework/types';
import type { FileAttachmentMetadata } from '../../../../common/types/domain_zod/attachment/file/v2';
type FileThumbnailProps = UnifiedReferenceAttachmentViewProps<FileAttachmentMetadata>;
export declare const FileThumbnail: React.MemoExoticComponent<(props: FileThumbnailProps) => React.JSX.Element | null>;
export {};
