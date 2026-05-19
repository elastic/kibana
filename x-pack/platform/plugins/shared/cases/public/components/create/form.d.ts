import React from 'react';
import type { CasePostRequest, ObservablePost } from '../../../common/types/api';
import type { CasesConfigurationUI, CaseUI } from '../../containers/types';
import type { CasesTimelineIntegration } from '../timeline_context';
import type { UseCreateAttachments } from '../../containers/use_create_attachments';
import type { CaseAttachmentsWithoutOwner } from '../../types';
import type { CreateCaseFormFieldsProps } from './form_fields';
export interface CreateCaseFormProps extends Pick<Partial<CreateCaseFormFieldsProps>, 'withSteps'> {
    onCancel: () => void;
    onSuccess: (theCase: CaseUI) => void;
    afterCaseCreated?: (theCase: CaseUI, createAttachments: UseCreateAttachments['mutate']) => Promise<void>;
    timelineIntegration?: CasesTimelineIntegration;
    attachments?: CaseAttachmentsWithoutOwner;
    observables?: ObservablePost[];
    initialValue?: Pick<CasePostRequest, 'title' | 'description'>;
}
type FormFieldsWithFormContextProps = Pick<CreateCaseFormFieldsProps, 'withSteps' | 'draftStorageKey'> & {
    isLoadingCaseConfiguration: boolean;
    currentConfiguration: CasesConfigurationUI;
    selectedOwner: string;
    onSelectedOwner: (owner: string) => void;
};
export declare const FormFieldsWithFormContext: React.FC<FormFieldsWithFormContextProps>;
export declare const CreateCaseForm: React.FC<CreateCaseFormProps>;
export {};
