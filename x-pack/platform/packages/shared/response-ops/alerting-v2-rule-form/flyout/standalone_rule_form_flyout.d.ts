import React from 'react';
import type { RuleFormServices } from '../form/contexts';
export interface StandaloneRuleFormFlyoutProps {
    /** Whether to use push flyout or overlay */
    push?: boolean;
    /** Callback when flyout is closed */
    onClose?: () => void;
    /** Initial query for the rule (only used on mount) */
    query: string;
    /** Required services */
    services: RuleFormServices;
}
export declare const StandaloneRuleFormFlyout: (props: StandaloneRuleFormFlyoutProps) => React.JSX.Element;
