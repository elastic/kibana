import type { FC } from 'react';
import type { FileUploadResults, GetAdditionalLinks, ResultLinks } from '@kbn/file-upload-common';
interface Props {
    resultLinks?: ResultLinks;
    getAdditionalLinks?: GetAdditionalLinks;
    setUploadResults?: (results: FileUploadResults) => void;
}
export declare const FileUploadView: FC<Props>;
export {};
