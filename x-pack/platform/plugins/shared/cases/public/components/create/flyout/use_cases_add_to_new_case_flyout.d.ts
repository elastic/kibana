import type React from 'react';
import type { ObservablePost } from '../../../../common/types/api';
import type { CaseAttachmentsWithoutOwner } from '../../../types';
import type { CreateCaseFlyoutProps } from './create_case_flyout';
type AddToNewCaseFlyoutProps = Omit<CreateCaseFlyoutProps, 'attachments'> & {
    toastTitle?: string;
    toastContent?: string;
};
export declare const useCasesAddToNewCaseFlyout: ({ initialValue, toastTitle, toastContent, afterCaseCreated, onSuccess, onClose, }?: AddToNewCaseFlyoutProps) => {
    open: ({ attachments, headerContent, observables, }?: {
        attachments?: CaseAttachmentsWithoutOwner;
        headerContent?: React.ReactNode;
        observables?: ObservablePost[];
    }) => void;
    close: () => void;
};
export type UseCasesAddToNewCaseFlyout = typeof useCasesAddToNewCaseFlyout;
export {};
