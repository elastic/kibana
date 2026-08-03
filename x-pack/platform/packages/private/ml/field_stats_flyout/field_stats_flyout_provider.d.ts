import { type FC, type PropsWithChildren } from 'react';
import type { DataView } from '@kbn/data-plugin/common';
import type { FieldStatsServices } from '@kbn/unified-field-list/src/components/field_stats';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import type { FieldStatsProps } from '@kbn/unified-field-list/src/components/field_stats';
/**
 * Props for the FieldStatsFlyoutProvider component.
 *
 * @typedef {Object} FieldStatsFlyoutProviderProps
 * @property dataView - The data view object.
 * @property fieldStatsServices - Services required for field statistics.
 * @property theme - The EUI theme service.
 * @property [timeRangeMs] - Optional time range in milliseconds.
 * @property [dslQuery] - Optional DSL query for filtering field statistics.
 * @property [disablePopulatedFields] - Optional flag to disable populated fields.
 */
export type FieldStatsFlyoutProviderProps = PropsWithChildren<{
    dataView: DataView;
    fieldStatsServices: FieldStatsServices;
    timeRangeMs?: TimeRangeMs;
    dslQuery?: FieldStatsProps['dslQuery'];
    disablePopulatedFields?: boolean;
}>;
/**
 * Provides field statistics in a flyout component.
 *
 * @component
 * @example
 * ```tsx
 * <FieldStatsFlyoutProvider
 *   dataView={dataView}
 *   fieldStatsServices={fieldStatsServices}
 *   timeRangeMs={timeRangeMs}
 *   dslQuery={dslQuery}
 *   disablePopulatedFields={disablePopulatedFields}
 * >
 *   {children}
 * </FieldStatsFlyoutProvider>
 * ```
 *
 * @param {FieldStatsFlyoutProviderProps} props - The component props.
 */
export declare const FieldStatsFlyoutProvider: FC<FieldStatsFlyoutProviderProps>;
