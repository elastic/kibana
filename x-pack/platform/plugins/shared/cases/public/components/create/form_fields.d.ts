import React from 'react';
import type { ActionConnector } from '../../../common/types/domain';
import type { CasesConfigurationUI } from '../../containers/types';
export interface CreateCaseFormFieldsProps {
    configuration: CasesConfigurationUI;
    connectors: ActionConnector[];
    isLoading: boolean;
    withSteps: boolean;
    draftStorageKey: string;
}
export declare const CreateCaseFormFields: React.FC<CreateCaseFormFieldsProps>;
