import { type AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { RULE_ATTACHMENT_TYPE, type RuleAttachmentData } from '@kbn/alerting-v2-schemas';
export { RULE_ATTACHMENT_TYPE };
import type { ApplicationStart, IBasePath, NotificationsStart } from '@kbn/core/public';
import type { Container } from 'inversify';
import type { RulesApi } from '../../services/rules_api';
export type RuleAttachment = Attachment<typeof RULE_ATTACHMENT_TYPE, RuleAttachmentData>;
interface RuleAttachmentDefinitionServices {
    rulesApi: RulesApi;
    application: ApplicationStart;
    basePath: IBasePath;
    notifications: NotificationsStart;
    container: Container;
}
export declare const createRuleAttachmentDefinition: ({ rulesApi, application, basePath, notifications, container, }: RuleAttachmentDefinitionServices) => AttachmentUIDefinition<RuleAttachment>;
