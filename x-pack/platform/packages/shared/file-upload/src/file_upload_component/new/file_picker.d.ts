import type { FC } from 'react';
import type { FileUploadManager } from '../../../file_upload_manager';
interface Props {
    fileUploadManager: FileUploadManager;
    fullWidth?: boolean;
    large?: boolean;
}
export declare const FilePicker: FC<Props>;
export {};
