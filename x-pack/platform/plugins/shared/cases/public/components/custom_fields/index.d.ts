import React from 'react';
import type { CustomFieldsConfiguration } from '../../../common/types/domain';
export interface Props {
    customFields: CustomFieldsConfiguration;
    disabled: boolean;
    isLoading: boolean;
    handleAddCustomField: () => void;
    handleDeleteCustomField: (key: string) => void;
    handleEditCustomField: (key: string) => void;
}
export declare const CustomFields: React.NamedExoticComponent<Props>;
