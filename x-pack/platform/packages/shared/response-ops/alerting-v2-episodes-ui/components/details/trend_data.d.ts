import { type AlertCondition } from '@kbn/alerting-v2-rule-form';
import type { EpisodeTrendRow } from '../../queries/episode_trend_query';
import type { TrendSeries, TrendThreshold } from './trend_types';
/**
 * Pivots `.rule-events` rows into one {@link TrendSeries} per requested label,
 * reading each label's value from the event's evaluated metrics. Events without
 * a value for a label (e.g. status-only recovery events with empty data) yield a
 * `null` point, so the line breaks where the rule recorded no value.
 */
export declare const mapEventDataToSeries: (rows: Array<Pick<EpisodeTrendRow, "@timestamp" | "metrics">>, seriesLabels: string[]) => TrendSeries[];
/** Converts parsed alert conditions into horizontal threshold lines. */
export declare const deriveTrendThresholds: (conditions: AlertCondition[]) => TrendThreshold[];
