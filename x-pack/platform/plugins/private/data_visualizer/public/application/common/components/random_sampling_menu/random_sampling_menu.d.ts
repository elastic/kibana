import type { FC } from 'react';
import type { RandomSampler } from '@kbn/ml-random-sampler-utils';
interface Props {
    randomSampler: RandomSampler;
    reload: () => void;
    id?: string;
}
export declare const SamplingMenu: FC<Props>;
export {};
