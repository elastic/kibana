import type { FC } from 'react';
import React from 'react';
import type { BrushSettings } from '@kbn/aiops-components';
import type { RandomSampler } from '@kbn/ml-random-sampler-utils';
import type { BarStyleAccessor } from '@elastic/charts';
import type { SingleBrushWindowParameters } from './document_count_chart_single_brush/single_brush';
import { type DataDriftStateManager } from './use_state_manager';
import { type DocumentCountStats } from '../../../common/types/field_stats';
import type { BrushSelectionUpdateHandler } from './document_count_chart_single_brush/document_count_chart_singular';
export interface DocumentCountContentProps {
    brush?: BrushSettings;
    brushSelectionUpdateHandler?: BrushSelectionUpdateHandler;
    documentCountStats?: DocumentCountStats;
    documentCountStatsSplit?: DocumentCountStats;
    documentCountStatsSplitLabel?: string;
    isBrushCleared: boolean;
    totalCount: number;
    sampleProbability: number;
    initialAnalysisStart?: number | SingleBrushWindowParameters;
    /** Optional color override for the default bar color for charts */
    barColorOverride?: string;
    /** Optional color override for the highlighted bar color for charts */
    barHighlightColorOverride?: string;
    incomingInitialAnalysisStart?: number | SingleBrushWindowParameters;
    randomSampler: RandomSampler;
    reload: () => void;
    approximate: boolean;
    stateManager: DataDriftStateManager;
    label?: React.ReactElement | string;
    /** Optional unique id  */
    id?: string;
    /** Optional style to override bar chart  */
    barStyleAccessor?: BarStyleAccessor;
}
export declare const DocumentCountWithBrush: FC<DocumentCountContentProps>;
