import React from 'react';
import type { TemplateConfiguration } from '../../../common/types/domain';
import type { ActionConnector } from '../../containers/configure/types';
import type { CasesConfigurationUI } from '../../containers/types';
interface FormFieldsProps {
    isSubmitting?: boolean;
    connectors: ActionConnector[];
    currentConfiguration: CasesConfigurationUI;
    isEditMode?: boolean;
    initialValue?: TemplateConfiguration | null;
}
export declare const FormFields: React.NamedExoticComponent<FormFieldsProps>;
export {};
