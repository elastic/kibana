import type { FC } from 'react';
import type { estypes } from '@elastic/elasticsearch';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Query } from '@kbn/es-query';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import type { Dictionary } from '@kbn/ml-common-types/common';
export interface ExplorationQueryBarProps {
    dataView: DataView;
    setSearchQuery: (update: {
        queryString: string;
        query?: estypes.QueryDslQueryContainer;
        language: SearchQueryLanguage;
    }) => void;
    includeQueryString?: boolean;
    query: Query;
    filters?: {
        options: Array<{
            id: string;
            label: string;
        }>;
        columnId: string;
        key: Dictionary<boolean>;
    };
}
export declare const ExplorationQueryBar: FC<ExplorationQueryBarProps>;
