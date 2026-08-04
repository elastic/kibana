import React from 'react';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { EpisodeActionState, AlertEpisodeGroupAction } from '../../types/action';
/**
 * Controls the grouping row, which is derived from the rule.
 */
export type GroupingRowStatus = 'visible' | 'hidden' | 'error';
export interface AlertEpisodeOverviewListProps {
    groupingFields: string[];
    groupingData: Record<string, unknown>;
    /** Source data view used to format grouping values with their field's `fieldFormats` formatter. */
    groupingDataView?: DataView;
    groupingStatus?: GroupingRowStatus;
    triggeredAt: string | undefined;
    durationMs: number | undefined;
    assigneeUid: string | undefined;
    episodeAction: EpisodeActionState | undefined;
    groupAction: AlertEpisodeGroupAction | undefined;
    userProfile: UserProfileService;
    dateFormat?: string;
}
export declare const AlertEpisodeOverviewList: ({ groupingFields, groupingData, groupingDataView, groupingStatus, triggeredAt, durationMs, assigneeUid, episodeAction, groupAction, userProfile, dateFormat, }: AlertEpisodeOverviewListProps) => React.JSX.Element;
