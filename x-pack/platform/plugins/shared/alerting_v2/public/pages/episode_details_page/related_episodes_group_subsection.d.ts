import React from 'react';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
export interface RelatedEpisodesGroupSubsectionProps {
    currentEpisodeId: string | undefined;
    groupHash: string | undefined;
    rule: RuleResponse;
    ruleId: string | undefined;
}
/**
 * Related episodes that share the same rule id and group_hash
 */
export declare function RelatedEpisodesGroupSubsection({ currentEpisodeId, groupHash, rule, ruleId, }: RelatedEpisodesGroupSubsectionProps): React.JSX.Element;
