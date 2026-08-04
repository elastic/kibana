import React from 'react';
import { type RuleState } from '../../../types/rule_state';
export interface RelatedEpisodesGroupSubsectionProps {
    currentEpisodeId: string | undefined;
    groupHash: string | undefined;
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
 * Related episodes that share the same rule id and group_hash
 */
export declare function RelatedEpisodesGroupSubsection({ currentEpisodeId, groupHash, ruleState, getEpisodeDetailsHref, compressed, }: RelatedEpisodesGroupSubsectionProps): React.JSX.Element | null;
