import type { FC } from 'react';
import { type FindFileStructureResponse } from '@kbn/file-upload-common';
interface Props {
    fileContents: string;
    results: FindFileStructureResponse;
    showTitle?: boolean;
    disableHighlighting?: boolean;
    index: number;
}
export declare const FileContents: FC<Props>;
export {};
