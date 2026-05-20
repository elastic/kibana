import React from 'react';
import type { CustomFieldsConfiguration } from '../../../../common/types/domain';
export interface Props {
    customFields: CustomFieldsConfiguration;
    onDeleteCustomField: (key: string) => void;
    onEditCustomField: (key: string) => void;
}
export declare const CustomFieldsList: React.NamedExoticComponent<Props>;
