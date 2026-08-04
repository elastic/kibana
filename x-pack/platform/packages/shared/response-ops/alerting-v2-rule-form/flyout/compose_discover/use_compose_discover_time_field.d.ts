export interface TimeFieldOption {
    value: string;
    text: string;
}
export interface ComposeDiscoverTimeFieldValue {
    timeFieldOptions: TimeFieldOption[];
    isTimeFieldResolved: boolean;
}
/**
 * Derives time-field resolution for the compose flyout purely from the current
 * form values (`query` + `timeField`) and the rule-form services. Read-only: it
 * never auto-selects a field (the flyout owns that side effect); consumers use
 * it to render the select options and to gate on whether a valid date field
 * exists for the rule's lookback window.
 */
export declare const useComposeDiscoverTimeField: () => ComposeDiscoverTimeFieldValue;
