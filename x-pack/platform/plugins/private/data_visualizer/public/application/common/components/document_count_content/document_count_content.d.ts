import type { FC } from 'react';
import type { RandomSamplerOption } from '../../../index_data_visualizer/constants/random_sampler';
import type { DocumentCountStats } from '../../../../../common/types/field_stats';
export interface Props {
    documentCountStats?: DocumentCountStats;
    totalCount: number;
    samplingProbability?: number | null;
    setSamplingProbability?: (value: number | null) => void;
    randomSamplerPreference?: RandomSamplerOption;
    setRandomSamplerPreference?: (value: RandomSamplerOption) => void;
    loading: boolean;
    showSettings?: boolean;
}
export declare const DocumentCountContent: FC<Props>;
