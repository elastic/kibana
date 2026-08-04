import type { MetricVisualizationState } from '@kbn/lens-common';
export type MetricVisualizationStateWithLegacyTitleWeight = MetricVisualizationState & {
    titleWeight?: unknown;
};
/**
 * Strips the deprecated `titleWeight` property that was removed from the
 * MetricVisualizationState type.
 */
export declare const removeLegacyTitleWeight: (state: MetricVisualizationStateWithLegacyTitleWeight) => MetricVisualizationState;
