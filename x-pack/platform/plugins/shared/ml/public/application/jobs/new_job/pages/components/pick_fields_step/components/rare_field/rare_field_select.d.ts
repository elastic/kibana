import type { FC } from 'react';
import type { Field, SplitField } from '@kbn/ml-anomaly-utils';
interface Props {
    fields: Field[];
    changeHandler(f: SplitField): void;
    selectedField: SplitField;
    testSubject?: string;
    placeholder?: string;
}
export declare const RareFieldSelect: FC<Props>;
export {};
