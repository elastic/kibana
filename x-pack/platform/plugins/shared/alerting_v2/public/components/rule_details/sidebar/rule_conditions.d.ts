import React from 'react';
export interface RuleConditionsProps {
    /**
     * `'full'` (default) shows all condition fields, matching the details page.
     * `'summary'` hides Recovery, Alert delay, Recovery delay, and No data config — used by the rule summary flyout.
     */
    variant?: 'full' | 'summary';
}
export declare const RuleConditions: React.FunctionComponent<RuleConditionsProps>;
