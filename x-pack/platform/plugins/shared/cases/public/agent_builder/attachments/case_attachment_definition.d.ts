import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser';
import { type CaseAttachment } from './case_inline_content';
interface Services {
    application: ApplicationStart;
}
export declare const createCaseAttachmentDefinition: (services: Services) => AttachmentUIDefinition<CaseAttachment>;
export {};
