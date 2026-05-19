import React from 'react';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '../../queries/episodes_query';
import type { EpisodeActionState, AlertEpisodeGroupAction } from '../../types/action';
export interface RelatedAlertEpisodeProps {
    episode: AlertEpisode;
    rule: RuleResponse;
    episodeAction?: EpisodeActionState;
    groupAction?: AlertEpisodeGroupAction;
    href: string;
}
export declare function RelatedAlertEpisode({ episode, rule, episodeAction, groupAction, href, }: RelatedAlertEpisodeProps): React.JSX.Element;
