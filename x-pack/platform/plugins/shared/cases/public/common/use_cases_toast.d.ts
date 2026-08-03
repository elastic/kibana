import type { ErrorToastOptions, ToastInputFields, ToastOptions } from '@kbn/core/public';
import type { CaseUI } from '../../common';
import type { CaseAttachmentsWithoutOwner, ServerError } from '../types';
export declare const useCasesToast: () => {
    showSuccessAttach: ({ theCase, attachments, title, content, }: {
        theCase: CaseUI;
        attachments?: CaseAttachmentsWithoutOwner;
        title?: string;
        content?: string;
    }) => import("@kbn/core/public").Toast;
    showErrorToast: (error: Error | ServerError, opts?: ErrorToastOptions) => void;
    showSuccessToast: (title: string, text?: ToastInputFields["text"], actionProps?: ToastInputFields["actionProps"]) => void;
    showDangerToast: (title: string, text?: React.ReactNode) => void;
    showInfoToast: (title: string, text?: string, actionProps?: ToastInputFields["actionProps"], options?: ToastOptions) => import("@kbn/core/public").Toast;
};
