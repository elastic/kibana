import React from 'react';
import { type RuleState } from '../../../types/rule_state';
export interface RelatedEpisodesRuleSubsectionProps {
    currentEpisodeId: string | undefined;
    currentGroupHash: string | undefined;
    ruleState: RuleState;
    getEpisodeDetailsHref: (episodeId: string) => string;
    /**
     * When `true`, drop the inner horizontal padding so the subsection sits
     * flush with its consumer's edges. Useful when rendering inside a container
     * that already provides outer padding (e.g. a narrow flyout body).
     */
    compressed?: boolean;
}
/**
 * Related episodes for the same rule: other group_hash values, or all other rule episodes if there is no group.
 */
export declare function RelatedEpisodesRuleSubsection({ currentEpisodeId, currentGroupHash, ruleState, getEpisodeDetailsHref, compressed, }: RelatedEpisodesRuleSubsectionProps): React.JSX.Element | null;
