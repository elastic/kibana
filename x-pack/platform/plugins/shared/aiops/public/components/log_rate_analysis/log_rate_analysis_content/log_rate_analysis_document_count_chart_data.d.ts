import { type FC } from 'react';
import type { Moment } from 'moment';
import type { estypes } from '@elastic/elasticsearch';
export interface LogRateAnalysisDocumentcountChartDataProps {
    /** Optional time range */
    timeRange?: {
        min: Moment;
        max: Moment;
    };
    /** Optional Elasticsearch query to pass to analysis endpoint */
    esSearchQuery?: estypes.QueryDslQueryContainer;
}
export declare const LogRateAnalysisDocumentCountChartData: FC<LogRateAnalysisDocumentcountChartDataProps>;
