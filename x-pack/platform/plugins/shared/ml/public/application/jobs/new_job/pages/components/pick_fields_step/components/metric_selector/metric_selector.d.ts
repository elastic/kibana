import type { FC } from 'react';
import type { Field, AggFieldPair } from '@kbn/ml-anomaly-utils';
import type { DropDownLabel, DropDownProps } from '../agg_select';
interface Props {
    fields: Field[];
    detectorChangeHandler: (options: DropDownLabel[]) => void;
    selectedOptions: DropDownProps;
    maxWidth?: number;
    removeOptions: AggFieldPair[];
}
export declare const MetricSelector: FC<Props>;
export {};
