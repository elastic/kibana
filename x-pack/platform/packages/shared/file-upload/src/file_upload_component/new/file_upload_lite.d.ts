import type { FC } from 'react';
import type { GetAdditionalLinks, OpenFileUploadLiteContext, ResultLinks } from '@kbn/file-upload-common';
import type { FileUploadStartDependencies } from '../kibana_context';
export interface Props {
    dependencies: FileUploadStartDependencies;
    resultLinks?: ResultLinks;
    getAdditionalLinks?: GetAdditionalLinks;
    props: OpenFileUploadLiteContext;
    onClose?: () => void;
}
export declare const FileDataVisualizerLite: FC<Props>;
export default FileDataVisualizerLite;
