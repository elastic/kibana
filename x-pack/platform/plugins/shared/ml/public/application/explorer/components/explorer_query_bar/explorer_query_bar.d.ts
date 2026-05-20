import type { FC } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { InfluencersFilterQuery } from '@kbn/ml-anomaly-utils';
export declare const DEFAULT_QUERY_LANG: "kuery";
export interface KQLFilterSettings {
    filterQuery: InfluencersFilterQuery;
    queryString: string;
    tableQueryString: string;
    isAndOperator: boolean;
    filteredFields: string[];
}
export declare function getKqlQueryValues({ inputString, queryLanguage, indexPattern, }: {
    inputString: string | {
        [key: string]: unknown;
    };
    queryLanguage: string;
    indexPattern: DataView;
}): {
    clearSettings: boolean;
    settings: KQLFilterSettings;
};
interface ExplorerQueryBarProps {
    filterActive: boolean;
    filterPlaceHolder?: string;
    indexPattern: DataView;
    queryString?: string;
    updateLanguage: (language: string) => void;
    dataViews?: DataView[];
}
export declare const ExplorerQueryBar: FC<ExplorerQueryBarProps>;
export {};
