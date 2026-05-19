import React from 'react';
import { type AttachmentRenderProps, type CanvasRenderCallbacks } from '@kbn/agent-builder-browser/attachments';
import type { ApplicationStart, IBasePath, NotificationsStart } from '@kbn/core/public';
import type { Container } from 'inversify';
import type { RulesApi } from '../../services/rules_api';
import type { RuleAttachment } from './rule_attachment_definition';
export interface RuleCanvasContentProps extends AttachmentRenderProps<RuleAttachment>, CanvasRenderCallbacks {
    rulesApi: RulesApi;
    application: ApplicationStart;
    basePath: IBasePath;
    notifications: NotificationsStart;
    container: Container;
}
export declare const RuleCanvasContent: ({ attachment, registerActionButtons, updateOrigin, rulesApi, application, basePath, notifications, container, }: RuleCanvasContentProps) => React.JSX.Element;
