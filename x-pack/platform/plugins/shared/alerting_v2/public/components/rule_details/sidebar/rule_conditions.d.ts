import React from 'react';
export interface RuleConditionsProps {
    /**
     * `'full'` (default) shows all condition fields, matching the details page.
     * `'summary'` hides Alert delay and Recovery delay — used by the rule summary flyout.
     */
    variant?: 'full' | 'summary';
}
export declare const RuleConditions: React.FunctionComponent<RuleConditionsProps>;
