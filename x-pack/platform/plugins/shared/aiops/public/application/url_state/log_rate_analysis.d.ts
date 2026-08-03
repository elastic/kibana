import type { WindowParameters } from '@kbn/aiops-log-rate-analysis';
import { type AiOpsFullIndexBasedAppState } from './common';
export interface LogRateAnalysisPageUrlState {
    pageKey: 'logRateAnalysis';
    pageUrlState: LogRateAnalysisAppState;
}
/**
 * To avoid long urls, we store the window parameters in the url state not with
 * their full parameters names but with abbrevations. `windowParametersToAppState` and
 * `appStateToWindowParameters` are used to transform the data structure.
 */
export interface LogRateAnalysisAppState extends AiOpsFullIndexBasedAppState {
    /** Window parameters */
    wp?: {
        /** Baseline minimum value */
        bMin: number;
        /** Baseline maximum value */
        bMax: number;
        /** Deviation minimum value */
        dMin: number;
        /** Deviation maximum value */
        dMax: number;
    };
}
/**
 * Transforms a full window parameters object to the abbreviated url state version.
 */
export declare const windowParametersToAppState: (wp?: WindowParameters) => LogRateAnalysisAppState["wp"];
/**
 * Transforms an abbreviated url state version of window parameters to its full version.
 */
export declare const appStateToWindowParameters: (wp: LogRateAnalysisAppState["wp"]) => WindowParameters | undefined;
export declare const getDefaultLogRateAnalysisAppState: (overrides?: Partial<LogRateAnalysisAppState>) => LogRateAnalysisAppState;
