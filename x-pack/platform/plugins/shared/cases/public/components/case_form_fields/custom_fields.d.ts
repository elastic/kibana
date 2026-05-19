import React from 'react';
import type { CasesConfigurationUI } from '../../../common/ui';
interface Props {
    isLoading: boolean;
    configurationCustomFields: CasesConfigurationUI['customFields'];
    setCustomFieldsOptional?: boolean;
    isEditMode?: boolean;
}
export declare const CustomFields: React.NamedExoticComponent<Props>;
export {};
