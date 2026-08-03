import type { FC } from 'react';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
interface Props {
    dataView: DataView;
    field: DataViewField;
    query: QueryDslQueryContainer;
    earliest: number | undefined;
    latest: number | undefined;
    iconOnly?: boolean;
}
export declare const CreateCategorizationJobButton: FC<Props>;
export {};
