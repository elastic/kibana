import type { FC } from 'react';
import type { FindFileStructureErrorResponse } from '@kbn/file-upload-common';
import type { FileAnalysis } from '../../../../file_upload_manager';
interface Props {
    fileStatus: FileAnalysis;
}
export declare const FileTooLarge: FC<Props>;
interface FileCouldNotBeReadProps {
    error: FindFileStructureErrorResponse;
    loaded: boolean;
    showEditFlyout(): void;
}
export declare const FileCouldNotBeRead: FC<FileCouldNotBeReadProps>;
export declare const Explanation: FC<{
    error: FindFileStructureErrorResponse;
}>;
export declare const FindFileStructurePermissionDenied: FC;
export {};
