import type { FC } from 'react';
import { type DataView } from '@kbn/data-plugin/common';
import type { FieldStatsProps, FieldStatsServices } from '@kbn/unified-field-list/src/components/field_stats';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
/**
 * Props for the FieldStatsFlyout component.
 *
 * @typedef {Object} FieldStatsFlyoutProps
 * @property dataView - The data view object.
 * @property fieldStatsServices - Services required for field statistics.
 * @property [timeRangeMs] - Optional time range in milliseconds.
 * @property [dslQuery] - Optional DSL query for filtering field statistics.
 */
export interface FieldStatsFlyoutProps {
    dataView: DataView;
    fieldStatsServices: FieldStatsServices;
    timeRangeMs?: TimeRangeMs;
    dslQuery?: FieldStatsProps['dslQuery'];
}
/**
 * Renders a flyout component for displaying field statistics.
 *
 * @component
 * @example
 * ```tsx
 * <FieldStatsFlyout
 *   dataView={dataView}
 *   fieldStatsServices={fieldStatsServices}
 *   timeRangeMs={timeRangeMs}
 *   dslQuery={dslQuery}
 * />
 * ```
 *
 * @param {Object} props - The component props.
 */
export declare const FieldStatsFlyout: FC<FieldStatsFlyoutProps>;
