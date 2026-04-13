import type { EuiThemeComputed } from '@elastic/eui';
import type { StreamQuery } from '@kbn/streams-schema';
import type { $Values } from 'utility-types';
import type { SignificantEventItem } from '../../../hooks/use_fetch_significant_events';
type EuiThemeColor = $Values<{
    [key in keyof EuiThemeComputed['colors']]: EuiThemeComputed['colors'][key] extends string ? key : never;
}>;
export interface FormattedChangePoint {
    query: StreamQuery;
    time: number;
    impact: 'high' | 'medium' | 'low';
    p_value: number;
    type: 'dip' | 'distribution_change' | 'spike' | 'step_change' | 'trend_change';
    label: string;
    color: EuiThemeColor;
}
export declare function formatChangePoint(item: Omit<SignificantEventItem, 'stream_name' | 'rule_backed'>): FormattedChangePoint | undefined;
export {};
