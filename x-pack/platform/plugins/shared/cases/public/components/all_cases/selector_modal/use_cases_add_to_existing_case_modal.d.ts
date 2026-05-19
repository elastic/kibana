import type { AllCasesSelectorModalProps } from '.';
import type { CaseUI } from '../../../containers/types';
import type { CaseAttachmentsWithoutOwner } from '../../../types';
import type { ObservablePost } from '../../../../common/types/api';
export type AddToExistingCaseModalProps = Omit<AllCasesSelectorModalProps, 'onRowClick'> & {
    successToaster?: {
        title?: string;
        content?: string;
    };
    noAttachmentsToaster?: {
        title?: string;
        content?: string;
    };
    onSuccess?: (theCase: CaseUI) => void;
};
export type GetAttachments = ({ theCase }: {
    theCase?: CaseUI;
}) => CaseAttachmentsWithoutOwner;
export declare const useCasesAddToExistingCaseModal: ({ successToaster, noAttachmentsToaster, onSuccess, onClose, onCreateCaseClicked, }?: AddToExistingCaseModalProps) => {
    open: ({ getAttachments, getObservables, }?: {
        getAttachments?: GetAttachments;
        getObservables?: ({ theCase }: {
            theCase?: CaseUI;
        }) => ObservablePost[];
    }) => void;
    close: () => void;
};
export type UseCasesAddToExistingCaseModal = typeof useCasesAddToExistingCaseModal;
