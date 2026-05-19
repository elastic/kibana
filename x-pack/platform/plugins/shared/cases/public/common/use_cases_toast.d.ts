import type { ErrorToastOptions, ToastInputFields } from '@kbn/core/public';
import React from 'react';
import type { CaseUI } from '../../common';
import type { CaseAttachmentsWithoutOwner, ServerError } from '../types';
import type { ObservablePost } from '../../common/types/api';
export declare const useCasesToast: () => {
    showSuccessAttach: ({ theCase, attachments, observables, title, content, }: {
        theCase: CaseUI;
        attachments?: CaseAttachmentsWithoutOwner;
        observables?: ObservablePost[];
        title?: string;
        content?: string;
    }) => import("@kbn/core/public").Toast;
    showErrorToast: (error: Error | ServerError, opts?: ErrorToastOptions) => void;
    showSuccessToast: (title: string, text?: ToastInputFields["text"]) => void;
    showDangerToast: (title: string, text?: string) => void;
    showInfoToast: (title: string, text?: string) => void;
};
export declare const CaseToastSuccessContent: {
    ({ onViewCaseClick, content, }: {
        onViewCaseClick?: () => void;
        content?: string;
    }): React.JSX.Element;
    displayName: string;
};
