import type { FC } from 'react';
import type { RandomSampler } from '../sampling_menu';
import type { MinimumTimeRangeOption } from '../../../../common/embeddables/pattern_analysis/types';
interface Props {
    randomSampler: RandomSampler;
    minimumTimeRangeOption: MinimumTimeRangeOption;
    setMinimumTimeRangeOption: (w: MinimumTimeRangeOption) => void;
    categoryCount: number | undefined;
    reload: () => void;
}
export declare const EmbeddableMenu: FC<Props>;
interface PatternAnalysisSettingsProps {
    minimumTimeRangeOption: MinimumTimeRangeOption;
    setMinimumTimeRangeOption: (w: MinimumTimeRangeOption) => void;
    categoryCount: number | undefined;
    compressed?: boolean;
}
export declare const PatternAnalysisSettings: FC<PatternAnalysisSettingsProps>;
export {};
