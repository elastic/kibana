import type { FC } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { UseIndexDataReturnType } from '@kbn/ml-data-grid';
import { type DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { estypes } from '@elastic/elasticsearch';
import type { useColorRange } from '../../../../../components/color_range_legend';
interface ExpandableSectionResultsProps {
    colorRange?: ReturnType<typeof useColorRange>;
    indexData: UseIndexDataReturnType;
    dataView?: DataView;
    jobConfig?: DataFrameAnalyticsConfig;
    needsDestDataView: boolean;
    resultsField?: string;
    searchQuery: estypes.QueryDslQueryContainer;
}
export declare const ExpandableSectionResults: FC<ExpandableSectionResultsProps>;
export {};
