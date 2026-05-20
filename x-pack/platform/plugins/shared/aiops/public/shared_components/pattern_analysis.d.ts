import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { TimeRange } from '@kbn/es-query';
import React, { type FC } from 'react';
import type { PublishesFilters } from '@kbn/presentation-publishing';
import type { RandomSamplerOption, RandomSamplerProbability } from '@kbn/ml-random-sampler-utils';
import type { AiopsPluginStartDeps } from '../types';
import type { MinimumTimeRangeOption } from '../../common/embeddables/pattern_analysis/types';
/**
 * Only used to initialize internally
 */
export type PatternAnalysisPropsWithDeps = PatternAnalysisProps & {
    coreStart: CoreStart;
    pluginStart: AiopsPluginStartDeps;
};
export type PatternAnalysisSharedComponent = FC<PatternAnalysisProps>;
export interface PatternAnalysisProps {
    dataViewId: string;
    timeRange: TimeRange;
    fieldName: string | undefined;
    minimumTimeRangeOption: MinimumTimeRangeOption;
    randomSamplerMode: RandomSamplerOption;
    randomSamplerProbability: RandomSamplerProbability;
    /**
     * Component to render if there are no patterns found
     */
    emptyState?: React.ReactElement;
    /**
     * Outputs the most recent patterns data
     */
    onChange?: (patterns: Category[]) => void;
    /**
     * Last reload request time, can be used for manual reload
     */
    lastReloadRequestTime?: number;
    /** Origin of the embeddable instance */
    embeddingOrigin?: string;
    onLoading: (isLoading: boolean) => void;
    onRenderComplete: () => void;
    onError: (error: Error) => void;
    filtersApi?: PublishesFilters;
}
declare const PatternAnalysisWrapper: FC<PatternAnalysisPropsWithDeps>;
export default PatternAnalysisWrapper;
