import { type FC } from 'react';
import type { ImportFailure } from '@kbn/file-upload-common';
interface Props {
    failedDocs: ImportFailure[];
    docCount: number;
}
export declare const Failures: FC<Props>;
export {};
