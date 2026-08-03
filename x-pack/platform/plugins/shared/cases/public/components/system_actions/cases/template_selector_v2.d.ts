import React from 'react';
/** Minimal legacy (v1) template shape needed to bridge a stored legacy key to its migrated name. */
export interface LegacyTemplateRef {
    key: string;
    name: string;
}
interface Props {
    owner: string;
    templateId: string | null;
    isLoading?: boolean;
    isDisabled?: boolean;
    /**
     * Legacy (v1) configure templates for this owner. Used only to display a rule that still stores a
     * legacy template `key`: the key is bridged to the migrated v2 template by name so the selector
     * shows it instead of appearing empty. Display-only — the stored value is not rewritten.
     */
    legacyTemplates?: LegacyTemplateRef[];
    onChange: (params: {
        templateId: string | null;
        templateVersion: string | null;
    }) => void;
}
export declare const TemplateSelectorV2: React.NamedExoticComponent<Props>;
export {};
