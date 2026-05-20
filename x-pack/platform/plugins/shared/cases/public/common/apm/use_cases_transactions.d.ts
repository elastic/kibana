import type { Transaction } from '@elastic/apm-rum';
import type { CaseAttachmentsWithoutOwner } from '../../types';
export type StartCreateCaseWithAttachmentsTransaction = (param?: {
    appId?: string;
    attachments?: CaseAttachmentsWithoutOwner;
}) => Transaction | undefined;
export declare const useCreateCaseWithAttachmentsTransaction: () => {
    startTransaction: StartCreateCaseWithAttachmentsTransaction;
};
export type StartAddAttachmentToExistingCaseTransaction = (param: {
    appId?: string;
    attachments: CaseAttachmentsWithoutOwner;
}) => Transaction | undefined;
export declare const useAddAttachmentToExistingCaseTransaction: () => {
    startTransaction: StartAddAttachmentToExistingCaseTransaction;
};
