/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { RULE_ATTACHMENT_TYPE, type RuleAttachmentData } from '@kbn/alerting-v2-schemas';

export { RULE_ATTACHMENT_TYPE };
import type { ApplicationStart, IBasePath, NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { Container } from 'inversify';
import type { RulesApi } from '../../services/rules_api';
import { RuleInlineContent } from './rule_inline_content';
import { RuleCanvasContent } from './rule_canvas_content';

export type RuleAttachment = Attachment<typeof RULE_ATTACHMENT_TYPE, RuleAttachmentData>;

interface RuleAttachmentDefinitionServices {
  rulesApi: RulesApi;
  application: ApplicationStart;
  basePath: IBasePath;
  notifications: NotificationsStart;
  container: Container;
}

export const createRuleAttachmentDefinition = ({
  rulesApi,
  application,
  basePath,
  notifications,
  container,
}: RuleAttachmentDefinitionServices): AttachmentUIDefinition<RuleAttachment> => ({
  getLabel: (attachment) => attachment.data.metadata.name,
  getIcon: () => 'bell',

  canvasWidth: '40vw',

  renderInlineContent: (props) => <RuleInlineContent {...props} />,

  renderCanvasContent: (props, callbacks) => (
    <RuleCanvasContent
      {...props}
      {...callbacks}
      rulesApi={rulesApi}
      application={application}
      basePath={basePath}
      notifications={notifications}
      container={container}
    />
  ),

  getActionButtons: ({ openCanvas, isCanvas }) => {
    if (isCanvas) return [];
    return [
      {
        label: i18n.translate('xpack.alertingV2.ruleAttachment.preview', {
          defaultMessage: 'Preview',
        }),
        icon: 'eye',
        type: ActionButtonType.SECONDARY,
        handler: () => openCanvas?.(),
      },
    ];
  },
});
