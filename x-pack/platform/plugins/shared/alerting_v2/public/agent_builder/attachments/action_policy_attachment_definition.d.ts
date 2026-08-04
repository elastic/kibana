import { type AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { ACTION_POLICY_ATTACHMENT_TYPE, type ActionPolicyAttachmentData } from '@kbn/alerting-v2-schemas';
export { ACTION_POLICY_ATTACHMENT_TYPE };
import type { Container } from 'inversify';
export type ActionPolicyAttachment = Attachment<typeof ACTION_POLICY_ATTACHMENT_TYPE, ActionPolicyAttachmentData>;
interface ActionPolicyAttachmentDefinitionServices {
    container: Container;
}
export declare const createActionPolicyAttachmentDefinition: ({ container, }: ActionPolicyAttachmentDefinitionServices) => AttachmentUIDefinition<ActionPolicyAttachment>;
