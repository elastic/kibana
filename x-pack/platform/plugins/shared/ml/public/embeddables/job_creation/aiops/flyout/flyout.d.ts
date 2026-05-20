import type { FC } from 'react';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { TimeRange } from '@kbn/es-query';
interface Props {
    dataView: DataView;
    field: DataViewField;
    query: QueryDslQueryContainer;
    timeRange: TimeRange;
    onClose: () => void;
}
export declare const CreateCategorizationJobFlyout: FC<Props>;
export {};
