import type { FC } from 'react';
import type { Field, SplitField } from '@kbn/ml-anomaly-utils';
interface Props {
    fields: Field[];
    changeHandler(f: SplitField): void;
    selectedField: SplitField;
    isClearable: boolean;
    testSubject?: string;
    placeholder?: string;
    titleId?: string;
    'aria-label'?: string;
}
export declare const SplitFieldSelect: FC<Props>;
export {};
