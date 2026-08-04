import React from 'react';
import type { RuleApiResponse } from '../../services/rules_api';
/**
 * Rule description text. Renders nothing when the rule has no description.
 */
export declare const RuleHeaderDescription: React.FC;
/**
 * Rule tags as plain hollow badges. Renders nothing when the rule has no tags.
 *
 * Only used standalone (e.g. the agent builder rule attachment) where tags aren't already shown
 * alongside the kind/status badges — see `RuleTitleWithBadges`'s `'summary'` variant for that.
 */
export declare const RuleTagsList: React.FC;
export interface RuleKindBadgeProps {
    kind: RuleApiResponse['kind'];
}
export declare const RuleKindBadge: React.FC<RuleKindBadgeProps>;
export interface RuleTitleWithBadgesProps {
    /**
     * `'full'` (default) renders the rule name, kind, and status inline,
     * separated by vertical dividers. `'summary'` stacks the name above a row
     * containing the kind and status badges, designed for the rule summary flyout.
     */
    variant?: 'full' | 'summary';
}
/**
 * Rule name with kind and status. Defaults to the inline `'full'` layout;
 * pass `variant="summary"` to render the name above the badges row.
 */
export declare const RuleTitleWithBadges: React.FC<RuleTitleWithBadgesProps>;
