import React from 'react';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { type RelatedAlertEpisodeProps } from '@kbn/alerting-v2-episodes-ui/components/related/related_alert_episode';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
export declare function RelatedAlertEpisodesList({ rows, rule, getEpisodeAction, getGroupAction, }: {
    rows: AlertEpisode[];
    rule: RuleResponse;
    getEpisodeAction: (episodeId: string) => RelatedAlertEpisodeProps['episodeAction'];
    getGroupAction: (groupHash: string) => RelatedAlertEpisodeProps['groupAction'];
}): React.JSX.Element;
