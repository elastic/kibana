import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { UploadState } from '@kbn/shared-ux-file-upload/src/upload_state';
import type { MarkdownEditorRef } from '../types';
import { type Owner } from '../../../../common/constants/types';
interface UseImagePasteUploadArgs {
    editorRef: React.ForwardedRef<MarkdownEditorRef | null>;
    field: FieldHook<string>;
    caseId: string;
    owner: Owner;
    fileKindId: string;
}
interface UseImagePasteUploadReturn {
    isUploading: boolean;
    uploadState: UploadState;
    errors?: Array<string | Error>;
}
export declare function useImagePasteUpload({ editorRef, field, caseId, owner, fileKindId, }: UseImagePasteUploadArgs): UseImagePasteUploadReturn;
export {};
