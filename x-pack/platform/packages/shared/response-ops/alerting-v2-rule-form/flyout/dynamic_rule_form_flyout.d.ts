import React from 'react';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { RuleFormServices } from '../form/contexts';
export interface DynamicRuleFormFlyoutProps {
    /** Whether to use push flyout or overlay */
    push?: boolean;
    /** Callback when flyout is closed */
    onClose?: () => void;
    /** The query that drives form values - changes will sync to form state */
    query: string;
    /** Required services */
    services: RuleFormServices;
    /** Whether to include the Form/YAML edit mode toggle (default: false) */
    includeYaml?: boolean;
    /**
     * ES|QL control variables from Discover. When provided (including `[]`),
     * the flyout inlines resolvable `?param` / `??param` tokens via Composer
     * and blocks save for any that remain unresolved.
     *
     * When `undefined`, the flyout treats the query as-is — no placeholder
     * scanning, no save gating — so non-ES|QL-control callers are unaffected.
     */
    esqlVariables?: ESQLControlVariable[];
    /**
     * Caller-supplied validation errors (merged with any unresolved-variable
     * errors computed internally).
     */
    validationErrors?: string[];
}
export declare const DynamicRuleFormFlyout: (props: DynamicRuleFormFlyoutProps) => React.JSX.Element;
