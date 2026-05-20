import React from 'react';
/**
 * Renders the description and tags row below the page title.
 */
export declare const RuleHeaderDescription: React.FC;
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
