import type { FC } from 'react';
import type { GetAdditionalLinks, ResultLinks } from '@kbn/file-upload-common';
interface Props {
    resultLinks?: ResultLinks;
    getAdditionalLinks?: GetAdditionalLinks;
    onClose?: () => void;
    setFileUploadActive: (active: boolean) => void;
    setDropzoneDisabled?: (disabled: boolean) => void;
}
export declare const FileUploadLiteLookUpView: FC<Props>;
export {};
