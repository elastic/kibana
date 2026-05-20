import type { FC } from 'react';
import type { Field } from '@kbn/ml-anomaly-utils';
interface Props {
    fields: Field[];
    changeHandler(i: Field | null): void;
    selectedField: Field | null;
}
export declare const GeoFieldSelect: FC<Props>;
export {};
