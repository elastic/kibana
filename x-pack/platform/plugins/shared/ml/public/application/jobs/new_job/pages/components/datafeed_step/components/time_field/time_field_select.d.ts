import type { FC } from 'react';
import type { Field } from '@kbn/ml-anomaly-utils';
interface Props {
    fields: Field[];
    changeHandler(i: string): void;
    selectedField: string;
    timeFieldTitleId: string;
}
export declare const TimeFieldSelect: FC<Props>;
export {};
