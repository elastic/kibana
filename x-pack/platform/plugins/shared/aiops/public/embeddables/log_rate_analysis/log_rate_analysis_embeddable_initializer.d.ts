import type { FC } from 'react';
import React from 'react';
import type { IndexPatternSelectProps } from '@kbn/unified-search-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LogRateAnalysisEmbeddableState } from '../../../common/embeddables/log_rate_analysis/types';
export interface LogRateAnalysisEmbeddableInitializerProps {
    dataViews: DataViewsPublicPluginStart;
    IndexPatternSelect: React.ComponentType<IndexPatternSelectProps>;
    initialInput?: Partial<LogRateAnalysisEmbeddableState>;
    onCreate: (props: LogRateAnalysisEmbeddableState) => void;
    onCancel: () => void;
    onPreview: (update: LogRateAnalysisEmbeddableState) => Promise<void>;
    isNewPanel: boolean;
}
export declare const LogRateAnalysisEmbeddableInitializer: FC<LogRateAnalysisEmbeddableInitializerProps>;
