import React, { type FC } from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { TimeRange } from '@kbn/es-query';
import type { SignificantItem } from '@kbn/ml-agg-utils';
import type { WindowParameters } from '@kbn/aiops-log-rate-analysis';
import type { PublishesFilters } from '@kbn/presentation-publishing';
import type { AiopsPluginStartDeps } from '../types';
/**
 * Only used to initialize internally
 */
export type LogRateAnalysisPropsWithDeps = LogRateAnalysisEmbeddableWrapperProps & {
    coreStart: CoreStart;
    pluginStart: AiopsPluginStartDeps;
};
export type LogRateAnalysisEmbeddableWrapper = FC<LogRateAnalysisEmbeddableWrapperProps>;
export interface LogRateAnalysisEmbeddableWrapperProps {
    dataViewId?: string;
    timeRange: TimeRange;
    /**
     * Component to render if there are no significant items found
     */
    emptyState?: React.ReactElement;
    /**
     * Outputs the most recent significant items
     */
    onChange?: (significantItems: SignificantItem[]) => void;
    /**
     * Last reload request time, can be used for manual reload
     */
    lastReloadRequestTime?: number;
    /** Origin of the embeddable instance */
    embeddingOrigin?: string;
    onLoading: (isLoading: boolean) => void;
    onRenderComplete: () => void;
    onError: (error: Error) => void;
    windowParameters?: WindowParameters;
    filtersApi?: PublishesFilters;
}
declare const LogRateAnalysisEmbeddableWrapperWithDeps: FC<LogRateAnalysisPropsWithDeps>;
export default LogRateAnalysisEmbeddableWrapperWithDeps;
