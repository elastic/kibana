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
import {
  ACTION_POLICY_ATTACHMENT_TYPE,
  type ActionPolicyAttachmentData,
} from '@kbn/alerting-v2-schemas';

export { ACTION_POLICY_ATTACHMENT_TYPE };
import { Context } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { Container } from 'inversify';
import { ActionPolicyInlineContent } from './action_policy_inline_content';
import { ActionPolicyCanvasContent } from './action_policy_canvas_content';

export type ActionPolicyAttachment = Attachment<
  typeof ACTION_POLICY_ATTACHMENT_TYPE,
  ActionPolicyAttachmentData
>;

interface ActionPolicyAttachmentDefinitionServices {
  container: Container;
}

export const createActionPolicyAttachmentDefinition = ({
  container,
}: ActionPolicyAttachmentDefinitionServices): AttachmentUIDefinition<ActionPolicyAttachment> => ({
  getLabel: (attachment) => attachment.data.name ?? 'Action Policy',
  getIcon: () => 'pagesSelect',

  canvasWidth: '40vw',

  renderInlineContent: (props) => <ActionPolicyInlineContent {...props} />,

  renderCanvasContent: (props, callbacks) => (
    <Context.Provider value={container}>
      <ActionPolicyCanvasContent {...props} {...callbacks} />
    </Context.Provider>
  ),

  getActionButtons: ({ openCanvas, isCanvas }) => {
    if (isCanvas) return [];
    return [
      {
        label: i18n.translate('xpack.alertingV2.actionPolicyAttachment.preview', {
          defaultMessage: 'Preview',
        }),
        icon: 'eye',
        type: ActionButtonType.SECONDARY,
        handler: () => openCanvas?.(),
      },
    ];
  },
});
