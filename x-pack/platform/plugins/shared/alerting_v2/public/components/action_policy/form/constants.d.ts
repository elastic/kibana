import type { GroupingMode, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import type { ActionPolicyFormState } from './types';
export declare const GROUPING_MODE_OPTIONS: Array<{
    id: GroupingMode;
    label: string;
}>;
export declare const GROUPING_MODE_HELP_TEXT: Record<GroupingMode, string>;
export declare const PER_EPISODE_STRATEGY_OPTIONS: Array<{
    value: ThrottleStrategy;
    text: string;
}>;
export declare const AGGREGATE_STRATEGY_OPTIONS: Array<{
    value: ThrottleStrategy;
    text: string;
}>;
export declare const DEFAULT_STRATEGY_FOR_MODE: Record<GroupingMode, ThrottleStrategy>;
export declare const PER_EPISODE_STRATEGY_HELP_TEXT: Partial<Record<ThrottleStrategy, string>>;
export declare const AGGREGATE_STRATEGY_HELP_TEXT: Partial<Record<ThrottleStrategy, string>>;
export declare const THROTTLE_INTERVAL_PATTERN: RegExp;
export declare const DEFAULT_THROTTLE_INTERVAL = "5m";
export declare const DURATION_UNIT_LABELS: Record<string, string>;
export interface EpisodeStatusFilterOption {
    value: 'active' | 'recovering' | 'pending' | 'inactive';
    title: string;
    badgeColor: 'danger' | 'success' | 'warning' | 'default';
    description: string;
}
export declare const EPISODE_STATUS_FILTER_OPTIONS: EpisodeStatusFilterOption[];
export declare const DEFAULT_FORM_STATE: ActionPolicyFormState;
