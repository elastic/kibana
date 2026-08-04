import type { FC } from 'react';
import type { FieldStatsProps, FieldStatsServices } from '@kbn/unified-field-list/src/components/field_stats';
import type { DataView, DataViewField } from '@kbn/data-plugin/common';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
interface FieldStatsContentProps {
    dataView: DataView;
    field: DataViewField;
    fieldName: string;
    fieldValue: string | number;
    fieldStatsServices: FieldStatsServices;
    timeRangeMs?: TimeRangeMs;
    dslQuery?: FieldStatsProps['dslQuery'];
}
export declare const FieldStatsContent: FC<FieldStatsContentProps>;
export {};
