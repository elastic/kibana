import type { FC } from 'react';
import type { Field } from '@kbn/ml-anomaly-utils';
interface Props {
    fields: Field[];
    changeHandler(i: string[]): void;
    selectedInfluencers: string[];
    titleId: string;
}
export declare const InfluencersSelect: FC<Props>;
export {};
