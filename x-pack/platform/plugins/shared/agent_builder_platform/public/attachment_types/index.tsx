/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { ILocatorClient } from '@kbn/share-plugin/common/url_service';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';

export const registerAttachmentUiDefinitions = ({
  attachments,
  locators,
}: {
  attachments: AttachmentServiceStartContract;
  locators: ILocatorClient;
}) => {
  attachments.addAttachmentType(AttachmentType.text, async () => {
    const { textAttachmentDefinition } = await import('./text_attachment');
    return textAttachmentDefinition;
  });
  attachments.addAttachmentType(AttachmentType.screenContext, async () => {
    const { screenContextAttachmentDefinition } = await import('./screen_context_attachment');
    return screenContextAttachmentDefinition;
  });
  attachments.addAttachmentType(AttachmentType.esql, async () => {
    const { createEsqlAttachmentDefinition } = await import('./esql_attachment');
    return createEsqlAttachmentDefinition({ locators });
  });
};
