import { type AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { CaseUI } from '../../common';
import { CASE_ATTACHMENT_TYPE, type CaseAttachmentData } from '../../common/types/agent_builder/attachment_schemas';
export declare const getCaseAttachmentData: (theCase: CaseUI, application: ApplicationStart) => CaseAttachmentData;
export declare const getCaseAttachment: (theCase: CaseUI, application: ApplicationStart) => AttachmentInput<typeof CASE_ATTACHMENT_TYPE, CaseAttachmentData>;
export declare const useAddCaseToChat: (theCase: CaseUI) => {
    addToChat: () => void;
    summarizeCase: () => void;
    isAddToChatAvailable: boolean;
};
