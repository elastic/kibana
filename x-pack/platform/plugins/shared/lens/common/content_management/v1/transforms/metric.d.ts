import type { MetricVisualizationState } from '../../../../public';
import type { LensAttributes } from '../../../../server/content_management/v1';
/**
 * Cleanup metric properties
 * - Move `valuesTextAlign` to `primaryAlign` and `secondaryAlign`
 * - Move `secondaryPrefix` to `secondaryLabel`
 */
export declare function metricMigrations(attributes: LensAttributes): LensAttributes;
export declare const getUpdatedMetricState: (state: MetricVisualizationState) => MetricVisualizationState;
