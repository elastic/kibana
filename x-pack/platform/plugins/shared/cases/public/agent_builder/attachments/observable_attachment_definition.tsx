/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type {
  OBSERVABLE_ATTACHMENT_TYPE,
  ObservableAttachmentData,
} from '../../../common/types/agent_builder/attachment_schemas';

export type ObservableAttachment = Attachment<
  typeof OBSERVABLE_ATTACHMENT_TYPE,
  ObservableAttachmentData
>;

/** An observable in the chat, labeled `<type>: <value>` like its flyout title. */
export const createObservableAttachmentDefinition =
  (): AttachmentUIDefinition<ObservableAttachment> => ({
    getLabel: ({ data: { type_label: typeLabel, type_key: typeKey, value } }) =>
      `${typeLabel ?? typeKey}: ${value}`,
    getIcon: () => 'eye',
  });
