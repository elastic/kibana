import React from 'react';
import type { ReactNode } from 'react';
import type { CasesConfigurationUI } from '../../../common/ui';
interface Props {
    isLoading: boolean;
    configurationCustomFields: CasesConfigurationUI['customFields'];
    setCustomFieldsOptional?: boolean;
    isEditMode?: boolean;
    /** Renders a Deprecated badge and "Legacy custom fields" heading. */
    showDeprecatedBadge?: boolean;
    /** Rendered below the section heading (e.g. deprecation callout). */
    notice?: ReactNode;
}
export declare const CustomFields: React.NamedExoticComponent<Props>;
export {};
