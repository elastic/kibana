import type { FC } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { CombinedQuery } from '../../../../index_data_visualizer/types/combined_query';
import type { FieldVisConfig } from '../../stats_table/types';
export declare const GeoPointContentWithMap: FC<{
    config: FieldVisConfig;
    dataView: DataView | undefined;
    combinedQuery?: CombinedQuery;
    esql?: string;
    timeFieldName?: string;
}>;
