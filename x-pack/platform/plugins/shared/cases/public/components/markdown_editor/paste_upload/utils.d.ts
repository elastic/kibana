import type { UploadState } from '@kbn/shared-ux-file-upload/src/upload_state';
import type { MarkdownEditorRef } from '../types';
/**
 * Returns a markdown link for the file with a link to the asset
 */
export declare const markdownImage: (fileName: string, fileUrl: string, ext?: string) => string;
/**
 * Gets the reference to the textarea element from the markdown editor
 */
export declare function getTextarea(editorRef: React.ForwardedRef<MarkdownEditorRef | null>): HTMLTextAreaElement | null;
export declare function canUpload(uploadState: UploadState, caseId: string): string | false;
