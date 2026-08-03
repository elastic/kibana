import React from 'react';
import type { CustomFieldsConfiguration } from '../../../common/types/domain';
export interface Props {
    customFields: CustomFieldsConfiguration;
    disabled: boolean;
    isLoading: boolean;
    handleAddCustomField: () => void;
    handleDeleteCustomField: (key: string) => void;
    handleEditCustomField: (key: string) => void;
    /**
     * Hides the described-form-group title/description. Used when the parent
     * (e.g. redesign SettingsSection) already provides section headings.
     */
    hideTitle?: boolean;
    /**
     * Renders the list without the surrounding subdued panel, as line-separated
     * rows. Only used by the cases redesign settings page.
     */
    useLineSeparators?: boolean;
    /** Overrides the default empty-state copy. Pass `null` to hide it. */
    emptyStateMessage?: string | null;
    /** Overrides the add-button label. */
    addButtonLabel?: string;
}
export declare const CustomFields: React.NamedExoticComponent<Props>;
