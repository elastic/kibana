import type { FC } from 'react';
import type { Field } from '@kbn/ml-anomaly-utils';
interface Props {
    fields: Field[];
    changeHandler(i: string | null): void;
    selectedField: string | null;
    titleId: string;
}
export declare const SummaryCountFieldSelect: FC<Props>;
export {};
