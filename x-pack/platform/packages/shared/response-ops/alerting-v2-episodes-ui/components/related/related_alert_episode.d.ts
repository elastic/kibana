import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { AlertEpisode } from '../../queries/episodes_query';
import type { EpisodeActionState, AlertEpisodeGroupAction } from '../../types/action';
export interface RelatedAlertEpisodeProps {
    episode: AlertEpisode;
    ruleName: string;
    groupingFields: string[];
    /** Source data view used to format grouping values with their field's `fieldFormats` formatter. */
    groupingDataView?: DataView;
    episodeAction?: EpisodeActionState;
    groupAction?: AlertEpisodeGroupAction;
    href: string;
    /**
     * Render the card with smaller padding. Useful inside narrow containers
     * (e.g. a flyout) where the default `paddingSize="m"` feels excessive.
     */
    compressed?: boolean;
}
export declare function RelatedAlertEpisode({ episode, ruleName, groupingFields, groupingDataView, episodeAction, groupAction, href, compressed, }: RelatedAlertEpisodeProps): React.JSX.Element;
