/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { toAlertingRuleViewSpec } from '@kbn/adaptive-ui-adapters';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { RULE_ATTACHMENT_TYPE, type RuleAttachmentData } from '@kbn/alerting-v2-schemas';

export { RULE_ATTACHMENT_TYPE };
import { Context } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { Container } from 'inversify';
import { RuleInlineContent } from './rule_inline_content';
import { RuleCanvasContent } from './rule_canvas_content';

export type RuleAttachment = Attachment<typeof RULE_ATTACHMENT_TYPE, RuleAttachmentData>;

interface RuleAttachmentDefinitionServices {
  container: Container;
}

export const createRuleAttachmentDefinition = ({
  container,
}: RuleAttachmentDefinitionServices): AttachmentUIDefinition<RuleAttachment> => ({
  getLabel: (attachment) => attachment.data.metadata.name,
  getIcon: () => 'watchesApp',

  canvasWidth: '40vw',

  getViewSpec: ({ data }) =>
    toAlertingRuleViewSpec({
      metadata: {
        name: data.metadata.name,
        description: data.metadata.description,
        tags: data.metadata.tags,
        builder_type: data.metadata.builder_type ?? undefined,
      },
      kind: data.kind,
      time_field: data.time_field,
      schedule: data.schedule,
      query: data.query,
      enabled: data.enabled,
    }),

  renderInlineContent: (props) => <RuleInlineContent {...props} />,

  renderCanvasContent: (props, callbacks) => (
    <Context.Provider value={container}>
      <RuleCanvasContent {...props} {...callbacks} />
    </Context.Provider>
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
