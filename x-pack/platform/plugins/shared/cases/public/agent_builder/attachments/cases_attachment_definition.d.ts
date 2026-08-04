import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser';
import { type CasesAttachment } from './cases_inline_content';
interface Services {
    application: ApplicationStart;
}
export declare const createCasesAttachmentDefinition: (services: Services) => AttachmentUIDefinition<CasesAttachment>;
export {};
