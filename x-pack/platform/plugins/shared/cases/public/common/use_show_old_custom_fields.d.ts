interface LegacyCustomFieldLike {
    required: boolean;
    defaultValue?: string | number | boolean | null;
}
/**
 * Required legacy custom fields without a configured default must remain visible
 * on create (server rejects the case otherwise). Matches
 * `validateRequiredCustomFields` in server/client/cases/validators.ts.
 */
export declare const hasRequiredCustomFieldsWithoutDefault: (customFields: readonly LegacyCustomFieldLike[]) => boolean;
/**
 * Local-storage-backed switch that gates visibility of legacy (pre-migration)
 * custom fields and templates across Settings, Create Case, and Case Details.
 * Defaults to OFF. Scoped per owner via `useCasesLocalStorage`.
 *
 * When `customFields` includes required fields without defaults, the switch is
 * forced ON and cannot be turned off until those fields are fixed.
 */
export declare const useShowLegacyCustomFields: (customFields?: readonly LegacyCustomFieldLike[]) => {
    showLegacyCustomFields: boolean;
    setShowLegacyCustomFields: (value: boolean | ((prev: boolean) => boolean)) => void;
    canDisableSwitch: boolean;
};
export {};
