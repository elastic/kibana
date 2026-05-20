import { type FileAttachmentMetadata } from '../../../../common/types/domain_zod/attachment/file/v2';
export declare const isImage: (file: {
    mimeType?: string;
}) => boolean | undefined;
export declare const parseMimeType: (mimeType: string | undefined) => string;
/** Runtime guard for the unified `file` attachment metadata. */
export declare const isValidFileMetadata: (metadata: unknown) => metadata is FileAttachmentMetadata;
export declare const getFileFromReferenceMetadata: ({ fileId, metadata, }: {
    fileId: string;
    metadata: FileAttachmentMetadata;
}) => {
    name: string;
    extension: string;
    mimeType: string;
    created: string;
    id: string;
};
