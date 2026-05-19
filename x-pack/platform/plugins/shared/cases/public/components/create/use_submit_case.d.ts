import type { CaseUI } from '../../containers/types';
import type { CasePostRequest, ObservablePost } from '../../../common/types/api';
import type { UseCreateAttachments } from '../../containers/use_create_attachments';
import type { CaseAttachmentsWithoutOwner } from '../../types';
export interface UseSubmitCaseProps {
    afterCaseCreated?: (theCase: CaseUI, createAttachments: UseCreateAttachments['mutateAsync']) => Promise<void>;
    onSuccess?: (theCase: CaseUI) => void;
    attachments?: CaseAttachmentsWithoutOwner;
    observables?: ObservablePost[];
}
export type UseSubmitCaseValue = ReturnType<typeof useSubmitCase>;
export declare const useSubmitCase: ({ attachments, observables, afterCaseCreated, onSuccess, }: UseSubmitCaseProps) => {
    submitCase: (data: CasePostRequest, isValid: boolean) => Promise<void>;
    isSubmitting: boolean;
};
