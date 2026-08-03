import { type FileAttachmentMetadata } from '../../../../common/types/domain_zod/attachment/file/v2';
import { type UnifiedReferenceAttachmentViewProps } from '../../../client/attachment_framework/types';
export type FileViewProps = UnifiedReferenceAttachmentViewProps<FileAttachmentMetadata>;
export declare const getFileAttachmentType: () => import("../../..").UnifiedReferenceAttachmentType;
