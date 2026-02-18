/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { TextAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';

/**
 * UI definition for text attachments
 */
export const textAttachmentDefinition: AttachmentUIDefinition<TextAttachment> = {
  getLabel: () =>
    i18n.translate('xpack.agentBuilderPlatform.attachments.text.label', {
      defaultMessage: 'Text',
    }),
  getIcon: () => 'document',
};
