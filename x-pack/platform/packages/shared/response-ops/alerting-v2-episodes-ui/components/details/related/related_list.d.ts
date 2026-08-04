import React from 'react';
import { type RelatedAlertEpisodeProps } from '../../related/related_alert_episode';
import type { AlertEpisode } from '../../../queries/episodes_query';
import { type RuleState } from '../../../types/rule_state';
export interface RelatedAlertEpisodesListProps {
    rows: AlertEpisode[];
    ruleState: RuleState;
    getEpisodeAction: (episodeId: string) => RelatedAlertEpisodeProps['episodeAction'];
    getGroupAction: (groupHash: string) => RelatedAlertEpisodeProps['groupAction'];
    getEpisodeDetailsHref: (episodeId: string) => string;
    /**
     * Render each card with smaller padding. Forwarded as `compressed` to
     * `RelatedAlertEpisode`.
     */
    compressed?: boolean;
}
export declare function RelatedAlertEpisodesList({ rows, ruleState, getEpisodeAction, getGroupAction, getEpisodeDetailsHref, compressed, }: RelatedAlertEpisodesListProps): React.JSX.Element;
