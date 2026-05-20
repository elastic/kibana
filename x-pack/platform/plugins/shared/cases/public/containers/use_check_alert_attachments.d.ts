import type { CaseUI } from './types';
import { type GetAttachments } from '../components/all_cases/selector_modal/use_cases_add_to_existing_case_modal';
export interface UseCheckAlertAttachmentsProps {
    cases: Pick<CaseUI, 'id'>[];
    getAttachments?: GetAttachments;
}
interface DocumentReference {
    alertId?: string[] | string;
    eventId?: string | string[];
    externalReferenceId?: string | string[];
}
export declare const hasDocReferences: <T>(arg: T) => arg is T & DocumentReference;
export declare const useCheckDocumentAttachments: ({ cases, getAttachments, }: UseCheckAlertAttachmentsProps) => {
    disabledCases: Set<string>;
    isLoading: boolean;
};
export type UseCheckDocumentAttachments = ReturnType<typeof useCheckDocumentAttachments>;
export {};
