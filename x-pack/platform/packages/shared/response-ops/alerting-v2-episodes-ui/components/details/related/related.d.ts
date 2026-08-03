import React from 'react';
import { type RuleState } from '../../../types/rule_state';
export interface AlertEpisodesRelatedProps {
    currentEpisodeId: string | undefined;
    groupHash: string | undefined;
    ruleState: RuleState;
    getEpisodeDetailsHref: (episodeId: string) => string;
    /**
     * Whether to render the "Related episodes" section heading. Defaults to `true`.
     * Set to `false` in containers (e.g. the flyout) where the section already
     * provides its own heading via the surrounding chrome.
     */
    showHeading?: boolean;
    /**
     * When `true`, the subsections drop their inner horizontal padding so the
     * content sits flush with the consumer's edges. Useful inside narrow
     * containers (e.g. a flyout) that already provide outer padding.
     */
    compressed?: boolean;
}
export declare function AlertEpisodesRelated({ currentEpisodeId, groupHash, ruleState, getEpisodeDetailsHref, showHeading, compressed, }: AlertEpisodesRelatedProps): React.JSX.Element | null;
