import type { FC } from 'react';
import React from 'react';
import type { EmbeddablePatternAnalysisInput } from '@kbn/aiops-log-pattern-analysis/embeddable';
export interface LogCategorizationEmbeddableProps {
    input: Readonly<EmbeddablePatternAnalysisInput>;
    renderViewModeToggle: (patternCount?: number) => React.ReactElement;
}
export declare const LogCategorizationDiscover: FC<LogCategorizationEmbeddableProps>;
export default LogCategorizationDiscover;
