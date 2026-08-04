import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
interface RegisterCasesAgentBuilderAttachmentsArgs {
    attachments: AttachmentServiceStartContract;
    application: ApplicationStart;
}
export declare const registerCasesAgentBuilderAttachments: ({ attachments, application, }: RegisterCasesAgentBuilderAttachmentsArgs) => void;
export {};
