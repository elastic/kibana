import React from 'react';
import type { ActionConnector, TemplateConfiguration } from '../../../common/types/domain';
import type { FormState } from '../configure_cases/flyout';
import type { TemplateFormProps } from './types';
import type { CasesConfigurationUI } from '../../containers/types';
interface Props {
    onChange: (state: FormState<TemplateConfiguration, TemplateFormProps>) => void;
    initialValue: TemplateConfiguration | null;
    connectors: ActionConnector[];
    currentConfiguration: CasesConfigurationUI;
    isEditMode?: boolean;
}
export declare const TemplateForm: React.NamedExoticComponent<Props>;
export {};
