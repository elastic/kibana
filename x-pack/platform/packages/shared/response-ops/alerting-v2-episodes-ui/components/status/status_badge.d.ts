import React from 'react';
import { type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
export interface AlertEpisodeStatusBadgeProps {
    status: AlertEpisodeStatus;
}
/**
 * Renders a badge indicating the status of an alerting episode.
 */
export declare function AlertEpisodeStatusBadge({ status }: AlertEpisodeStatusBadgeProps): React.JSX.Element;
