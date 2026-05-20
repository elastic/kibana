import { type FC } from 'react';
import type { TimeRange } from '@kbn/es-query';
export interface LogRateAnalysisForEmbeddableProps {
    timeRange: TimeRange;
}
export declare const LogRateAnalysisForEmbeddable: FC<LogRateAnalysisForEmbeddableProps>;
