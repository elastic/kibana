/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';

export enum FlyoutGroupedAttachments {
  ALERTS = 'alerts',
  ATTACKS = 'attacks',
  RULES = 'rules',
}

export interface FlyoutGroupedAttachmentRendererProps {
  attachments: UnknownAttachment[];
}

export interface FlyoutGroupedAttachmentDefinition {
  attachmentTypes: readonly string[];
  renderer: ComponentType<FlyoutGroupedAttachmentRendererProps>;
}

export type RegisterFlyoutGroupedAttachment = (
  group: FlyoutGroupedAttachments,
  attachmentTypes: FlyoutGroupedAttachmentDefinition['attachmentTypes'],
  renderer: FlyoutGroupedAttachmentDefinition['renderer']
) => void;

export interface FlyoutGroupedAttachmentsRegistry {
  register: RegisterFlyoutGroupedAttachment;
  get: (group: FlyoutGroupedAttachments) => FlyoutGroupedAttachmentDefinition | undefined;
}
