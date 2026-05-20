import type { FC } from 'react';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
interface Props {
    dataView: DataView;
    field: DataViewField;
    query: QueryDslQueryContainer;
    timeRange: TimeRange;
}
export declare const CreateJob: FC<Props>;
export {};
