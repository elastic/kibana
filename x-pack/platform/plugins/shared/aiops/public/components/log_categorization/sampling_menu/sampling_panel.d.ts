import type { FC } from 'react';
import type { RandomSampler } from './random_sampler';
interface Props {
    randomSampler: RandomSampler;
    displayProbability?: boolean;
    calloutPosition?: 'top' | 'bottom';
    compressed?: boolean;
    reload: () => void;
}
export declare const SamplingPanel: FC<Props>;
export {};
