import type { MetricVisualizationState } from '@kbn/lens-common';
/**
 * Normalizes legacy saved states where `density` was not yet persisted.
 *
 * The previous metric chart layout maps to the new "compact" density option, so
 * old saved objects must get it explicitly before rendering.
 */
export declare const convertDensity: (state: MetricVisualizationState) => MetricVisualizationState;
