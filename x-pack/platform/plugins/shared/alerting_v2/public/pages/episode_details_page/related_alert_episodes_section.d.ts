import React from 'react';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
export interface RelatedAlertEpisodesSectionProps {
    currentEpisodeId: string | undefined;
    groupHash: string | undefined;
    rule: RuleResponse;
    ruleId: string | undefined;
}
export declare function RelatedAlertEpisodesSection({ currentEpisodeId, groupHash, rule, ruleId, }: RelatedAlertEpisodesSectionProps): React.JSX.Element;
