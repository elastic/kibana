import React from 'react';
import type { FieldStatsServices, FieldStatsProps } from '@kbn/unified-field-list/src/components/field_stats';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
export declare function FieldStatsPopover({ dataView, dslQuery, fieldName, fieldValue, fieldStatsServices, timeRangeMs, }: {
    dataView: DataView;
    dslQuery?: FieldStatsProps['dslQuery'];
    fieldName: string;
    fieldValue: string | number;
    fieldStatsServices: FieldStatsServices;
    timeRangeMs?: TimeRangeMs;
}): React.JSX.Element | null;
