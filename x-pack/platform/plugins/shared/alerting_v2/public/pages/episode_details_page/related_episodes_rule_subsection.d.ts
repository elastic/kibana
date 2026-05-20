import React from 'react';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
export interface RelatedEpisodesRuleSubsectionProps {
    currentEpisodeId: string | undefined;
    currentGroupHash: string | undefined;
    rule: RuleResponse;
    ruleId: string | undefined;
}
/**
 * Related episodes for the same rule: other group_hash values, or all other rule episodes if there is no group.
 */
export declare function RelatedEpisodesRuleSubsection({ currentEpisodeId, currentGroupHash, rule, ruleId, }: RelatedEpisodesRuleSubsectionProps): React.JSX.Element;
