import { type FileAttachmentMetadata } from '../../../../common/types/domain_zod/attachment/file/v2';
import type { CaseUI } from '../../../../common/ui/types';
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
/** Minimal identity of a file already attached to a case (name + extension). */
export interface AttachedFile {
    name: string;
    extension: string;
}
/** Name + extension of every file already attached to a case. */
export declare const getFilesFromComments: (comments: CaseUI["comments"], owner: string) => AttachedFile[];
/**
 * Collects the set of file ids referenced by a case's comments. Used by
 * `CaseViewFiles` to intersect the files-API response against the (possibly
 * filtered) comment list so the badge and the file table stay in sync.
 */
export declare const getFileIdsFromComments: (comments: CaseUI["comments"], owner: string) => Set<string>;
