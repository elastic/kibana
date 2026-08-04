import { type AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { RULE_ATTACHMENT_TYPE, type RuleAttachmentData } from '@kbn/alerting-v2-schemas';
export { RULE_ATTACHMENT_TYPE };
import type { Container } from 'inversify';
export type RuleAttachment = Attachment<typeof RULE_ATTACHMENT_TYPE, RuleAttachmentData>;
interface RuleAttachmentDefinitionServices {
    container: Container;
}
export declare const createRuleAttachmentDefinition: ({ container, }: RuleAttachmentDefinitionServices) => AttachmentUIDefinition<RuleAttachment>;
