import type { FC } from 'react';
import { type OpenFileUploadLiteContext } from '@kbn/file-upload-common';
import type { GetAdditionalLinks, ResultLinks } from '@kbn/file-upload-common';
interface Props {
    resultLinks?: ResultLinks;
    getAdditionalLinks?: GetAdditionalLinks;
    props: OpenFileUploadLiteContext;
    onClose?: () => void;
}
export declare const FileUploadLiteView: FC<Props>;
export {};
