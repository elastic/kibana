import type { FC } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { GetAdditionalLinks } from '../../../common/components/results_links';
interface Props {
    dataView: DataView;
    searchString?: string | {
        [key: string]: any;
    };
    searchQueryLanguage?: string;
    getAdditionalLinks?: GetAdditionalLinks;
}
export declare const ActionsPanel: FC<Props>;
export {};
