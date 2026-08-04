import type { ApplicationStart } from '@kbn/core-application-browser';
import type { CaseAttachmentData } from '../../../common/types/agent_builder/attachment_schemas';
export declare const getAppIdForOwner: (owner: string) => string;
export declare const getCasesListPathForOwner: (owner: string, query?: string) => string;
export declare const getCaseUrls: ({ application, data, }: {
    data: CaseAttachmentData;
    application: ApplicationStart;
}) => {
    case: string;
    activityTab: string;
    alertsTab: string;
    attachmentsTab: string;
};
