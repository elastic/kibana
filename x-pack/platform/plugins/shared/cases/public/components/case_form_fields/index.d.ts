import React from 'react';
import type { CasesConfigurationUI } from '../../containers/types';
interface Props {
    isLoading: boolean;
    configurationCustomFields: CasesConfigurationUI['customFields'];
    setCustomFieldsOptional?: boolean;
    isEditMode?: boolean;
    draftStorageKey?: string;
}
export declare const CaseFormFields: React.NamedExoticComponent<Props>;
export {};
