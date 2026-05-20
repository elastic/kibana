import React from 'react';
export interface RuleFormFlyoutProps {
    push?: boolean;
    onClose?: () => void;
    isLoading?: boolean;
    isSaveDisabled?: boolean;
    children: React.ReactNode;
}
/**
 * Base flyout wrapper - a pure presentation component.
 *
 * Use DynamicRuleFormFlyout or StandaloneRuleFormFlyout for pre-composed
 * flyouts that handle form submission and state management.
 *
 * In push mode, EUI disables its built-in focus trap so both the flyout
 * and the page remain interactive. A lightweight `onFocusCapture` handler
 * on the content wrapper redirects keyboard-initiated focus (Tab / Enter)
 * back to the source element, while click-initiated focus passes through
 * unaffected. Autocomplete on unfocused editors is separately suppressed
 * by the `sharedEsqlSuggestionProvider` focus-check in `esql_editor.tsx`.
 */
export declare const RuleFormFlyout: ({ push, onClose, isLoading, isSaveDisabled, children, }: RuleFormFlyoutProps) => React.JSX.Element;
