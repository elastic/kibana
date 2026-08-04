import type { MetricVisualizationState } from '@kbn/lens-common';
/**
 * Normalizes legacy saved states where `applyColorTo` was not yet persisted.
 *
 * Old saved objects may have `color` or `palette` set without an explicit
 * `applyColorTo` value. In that case the previous implicit behavior was
 * "background", so we make it explicit here.
 */
export declare const convertApplyColorTo: (state: MetricVisualizationState) => MetricVisualizationState;
