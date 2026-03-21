import type { InputOverrides } from '@kbn/file-upload-common';
import type { FC } from 'react';
import type { FileAnalysis } from '../../../../../file_upload_manager';
interface Props {
    setOverrides: (overrides: InputOverrides) => void;
    closeEditFlyout: () => void;
    isFlyoutVisible: boolean;
    fileStatus: FileAnalysis;
    fields: string[];
}
export declare const EditFlyout: FC<Props>;
export {};
