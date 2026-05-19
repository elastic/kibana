import type { FC } from 'react';
import type { ResultLinks } from '@kbn/file-upload-common';
import type { GetAdditionalLinks } from '@kbn/file-upload-common/src/types';
interface Props {
    index: string;
    dataViewId: string | undefined;
    timeFieldName?: string;
    createDataView: boolean;
    showFilebeatFlyout?: () => void;
    getAdditionalLinks?: GetAdditionalLinks;
    resultLinks?: ResultLinks;
}
export declare const ResultsLinks: FC<Props>;
export {};
