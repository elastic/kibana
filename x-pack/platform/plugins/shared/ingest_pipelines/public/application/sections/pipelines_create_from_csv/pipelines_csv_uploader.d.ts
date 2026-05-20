import type { FC } from 'react';
import type { FieldCopyAction } from '../../../../common/types';
interface Props {
    actionOptions: FieldCopyAction[];
    onFilePickerChange(files: FileList | null): void;
    onFileUpload(action: string | null): void;
    isLoading: boolean;
    isUploaded: boolean;
    hasError: boolean;
    hasFile: boolean;
}
export declare const PipelinesCsvUploader: FC<Props>;
export {};
