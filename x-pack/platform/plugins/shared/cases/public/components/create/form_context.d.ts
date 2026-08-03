import React from 'react';
import type { CasesConfigurationUI } from '../../containers/types';
import type { CasePostRequest } from '../../../common/types/api';
import { type UseSubmitCaseValue } from './use_submit_case';
export interface FormContextProps {
    children?: JSX.Element | JSX.Element[];
    initialValue?: Pick<CasePostRequest, 'title' | 'description'>;
    currentConfiguration: CasesConfigurationUI;
    selectedOwner: string;
    onSubmitCase: UseSubmitCaseValue['submitCase'];
}
export declare const FormContext: React.FC<FormContextProps>;
