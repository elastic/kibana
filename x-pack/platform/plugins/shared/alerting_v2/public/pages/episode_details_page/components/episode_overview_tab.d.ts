import React from 'react';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type { EpisodeEventRow } from '@kbn/alerting-v2-episodes-ui/queries/episode_events_query';
interface EpisodeOverviewTabProps {
    episodeId: string;
    eventRows: EpisodeEventRow[];
    groupHash: string | undefined;
    rule: RuleResponse | undefined;
}
export declare const EpisodeOverviewTab: ({ episodeId, eventRows, groupHash, rule, }: EpisodeOverviewTabProps) => React.JSX.Element;
export {};
