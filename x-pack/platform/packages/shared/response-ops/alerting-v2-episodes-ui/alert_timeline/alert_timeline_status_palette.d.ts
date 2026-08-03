import type { EuiThemeComputed } from '@elastic/eui';
import { type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
export declare const alertTimelineStatusColor: (euiTheme: EuiThemeComputed, status: AlertEpisodeStatus) => string;
export declare const alertTimelineStatusLabel: (status: AlertEpisodeStatus) => string;
export declare const ALERT_TIMELINE_STATUS_LEGEND_ORDER: readonly AlertEpisodeStatus[];
