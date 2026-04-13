import type { ElasticsearchClient } from '@kbn/core/server';
import type { PreviewChartResponse } from '../../../common/api_types';
export declare const getFilteredBarSeries: (barSeries: PreviewChartResponse["series"]) => {
    name: string;
    data: {
        x: number;
        y: number | null;
    }[];
}[];
export declare function getChartPreview({ esClient, index, groupBy, start, end, interval, }: {
    esClient: ElasticsearchClient;
    index: string;
    groupBy: string[];
    start: string;
    end: string;
    interval: string;
}): Promise<PreviewChartResponse>;
