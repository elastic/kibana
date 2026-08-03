import type { FC } from 'react';
import type { FieldStatsProps, FieldStatsServices } from '@kbn/unified-field-list/src/components/field_stats';
import type { DataView } from '@kbn/data-plugin/common';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
/**
 * Represents the props for the FieldStatsFlyout component.
 */
export interface FieldStatsFlyoutProps {
    /**
     * The data view object.
     */
    dataView: DataView;
    /**
     * Services required for field statistics.
     */
    fieldStatsServices: FieldStatsServices;
    /**
     * Optional time range in milliseconds.
     */
    timeRangeMs?: TimeRangeMs;
    /**
     * Optional DSL query for filtering field statistics.
     */
    dslQuery?: FieldStatsProps['dslQuery'];
}
/**
 * Renders the content for the field statistics flyout.
 * @param props - The props for the FieldStatsContent component.
 * @returns The rendered FieldStatsContent component.
 */
export declare const FieldStatsContent: FC<FieldStatsFlyoutProps>;
