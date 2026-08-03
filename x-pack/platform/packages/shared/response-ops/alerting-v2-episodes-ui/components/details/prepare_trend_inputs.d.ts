import { type RuleResponse } from '@kbn/alerting-v2-schemas';
import type { TrendMetricGroup } from './trend_types';
/**
 * Reads the threshold rule to produce one {@link TrendMetricGroup} per metric that
 * appears in an alert condition — each group carries the metric label and all
 * threshold conditions that check it.
 *
 * Returns null when the rule is not a parseable threshold rule — the caller then
 * renders nothing.
 */
export declare const prepareTrendInputs: (rule: RuleResponse | undefined) => TrendMetricGroup[] | null;
