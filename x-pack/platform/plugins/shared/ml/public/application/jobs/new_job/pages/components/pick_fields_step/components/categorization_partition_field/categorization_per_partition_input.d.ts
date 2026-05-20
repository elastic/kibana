import type { FC } from 'react';
import type { Field } from '@kbn/ml-anomaly-utils';
interface Props {
    fields: Field[];
    changeHandler(i: string | null): void;
    selectedField: string | null;
}
export declare const CategorizationPerPartitionFieldSelect: FC<Props>;
export {};
