import React from 'react';
import type { CaseUI } from '../../../../common';
import type { OnUpdateFields } from '../types';
interface GlobalCaseFieldsProps {
    caseData: CaseUI;
    onUpdateField: (args: OnUpdateFields) => void;
    /**
     * When false, skips the "Extended fields" heading (redesign accordion already labels the section).
     * Defaults to true for the legacy case view.
     */
    showSectionTitle?: boolean;
}
/**
 * Renders all field definitions that have `isGlobal: true` for the
 * case's owner, regardless of which template (if any) the case uses.
 * Fields that are also referenced via `$ref` in the active template are
 * excluded here — the template section owns their display and may apply
 * name/default overrides.
 * Values are stored in `extended_fields` alongside template-specific fields.
 */
export declare const GlobalCaseFields: React.NamedExoticComponent<GlobalCaseFieldsProps>;
export {};
