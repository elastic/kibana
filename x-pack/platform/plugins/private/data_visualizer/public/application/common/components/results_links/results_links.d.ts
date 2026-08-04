import type { FC } from 'react';
import type { ResultLinks } from '@kbn/file-upload-common';
type LinkType = 'file' | 'index';
export interface GetAdditionalLinksParams {
    dataViewId: string;
    dataViewTitle?: string;
    globalState?: any;
}
export type GetAdditionalLinks = Array<(params: GetAdditionalLinksParams) => Promise<ResultLink[] | undefined>>;
export interface ResultLink {
    id: string;
    type: LinkType;
    title: string;
    icon: string;
    description: string;
    getUrl(params?: any): Promise<string>;
    canDisplay(params?: any): Promise<boolean>;
    'data-test-subj'?: string;
}
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
