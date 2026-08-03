import type { EuiBadgeProps } from '@elastic/eui';
import React from 'react';
import { type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
export interface AlertEpisodeStatusBadgeProps {
    status: AlertEpisodeStatus;
}
/** Colors shared between the status badge and the status filter's dot indicator. */
export declare const EPISODE_STATUS_BADGE_COLORS: Record<AlertEpisodeStatus, NonNullable<EuiBadgeProps['color']>>;
/**
 * Renders a badge indicating the status of an alerting episode.
 */
export declare function AlertEpisodeStatusBadge({ status }: AlertEpisodeStatusBadgeProps): React.JSX.Element;
