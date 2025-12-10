/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AttachmentServiceStartContract } from '@kbn/onechat-browser';
import {
  AttachmentType,
  type TextAttachment,
  type ScreenContextAttachment,
  type EsqlAttachment,
  type VisualizationAttachment,
} from '@kbn/onechat-common/attachments';

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
    isEditable: true,
  });

  attachments.addAttachmentType<ScreenContextAttachment>(AttachmentType.screenContext, {
    getLabel: () =>
      i18n.translate('xpack.agentBuilderPlatform.attachments.screenContext.label', {
        defaultMessage: 'Screen context',
      }),
    getIcon: () => 'inspect',
    isEditable: false,
  });

  attachments.addAttachmentType<EsqlAttachment>(AttachmentType.esql, {
    getLabel: () =>
      i18n.translate('xpack.agentBuilderPlatform.attachments.esql.label', {
        defaultMessage: 'ES|QL query',
      }),
    getIcon: () => 'editorCodeBlock',
    isEditable: true,
  });

  attachments.addAttachmentType<VisualizationAttachment>(AttachmentType.visualization, {
    getLabel: (attachment) =>
      attachment.data?.description ||
      i18n.translate('xpack.agentBuilderPlatform.attachments.visualization.label', {
        defaultMessage: 'Visualization',
      }),
    getIcon: () => 'visBarVerticalStacked',
    isEditable: false,
  });
};
