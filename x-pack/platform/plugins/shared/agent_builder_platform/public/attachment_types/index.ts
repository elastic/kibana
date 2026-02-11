/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import {
  AttachmentType,
  type TextAttachment,
  type ScreenContextAttachment,
  type EsqlAttachment,
} from '@kbn/agent-builder-common/attachments';

export const registerAttachmentUiDefinitions = ({
  attachments,
}: {
  attachments: AttachmentServiceStartContract;
}) => {
  attachments.addAttachmentType<TextAttachment>(AttachmentType.text, {
    getLabel: () =>
      i18n.translate('xpack.agentBuilderPlatform.attachments.text.label', {
        defaultMessage: 'Text',
      }),
    getIcon: () => 'document',
  });

  attachments.addAttachmentType<ScreenContextAttachment>(AttachmentType.screenContext, {
    getLabel: () =>
      i18n.translate('xpack.agentBuilderPlatform.attachments.screenContext.label', {
        defaultMessage: 'Screen context',
      }),
    getIcon: () => 'inspect',
  });

  attachments.addAttachmentType<EsqlAttachment>(AttachmentType.esql, {
    getLabel: () =>
      i18n.translate('xpack.agentBuilderPlatform.attachments.esql.label', {
        defaultMessage: 'ES|QL query',
      }),
    getIcon: () => 'editorCodeBlock',
  });
};
