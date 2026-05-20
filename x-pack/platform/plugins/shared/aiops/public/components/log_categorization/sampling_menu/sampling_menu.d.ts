import type { FC } from 'react';
import type { RandomSampler } from './random_sampler';
interface Props {
    randomSampler: RandomSampler;
    reload: () => void;
}
export declare const SamplingMenu: FC<Props>;
export {};
