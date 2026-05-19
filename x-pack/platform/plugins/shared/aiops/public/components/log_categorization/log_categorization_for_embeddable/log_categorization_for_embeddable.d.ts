import type { FC } from 'react';
import type { EmbeddablePatternAnalysisInput } from '@kbn/aiops-log-pattern-analysis/embeddable';
import type { PatternAnalysisProps } from '../../../shared_components/pattern_analysis';
export type LogCategorizationEmbeddableProps = Readonly<EmbeddablePatternAnalysisInput & PatternAnalysisProps>;
export declare const LogCategorizationEmbeddable: FC<LogCategorizationEmbeddableProps>;
export default LogCategorizationEmbeddable;
