import type { FC } from 'react';
import { type MetricFieldsCountProps, type TotalFieldsCountProps } from '../stats_table/components/field_count_stats';
interface Props extends TotalFieldsCountProps, MetricFieldsCountProps {
    showEmptyFields: boolean;
    toggleShowEmptyFields: () => void;
}
export declare const FieldCountPanel: FC<Props>;
export {};
