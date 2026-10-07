/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  FlyoutGroupedAttachments,
  type FlyoutGroupedAttachmentDefinition,
  type FlyoutGroupedAttachmentRendererProps,
  type FlyoutGroupedAttachmentsRegistry,
  type RegisterFlyoutGroupedAttachment,
} from './types';
export { createFlyoutGroupedAttachmentsRegistry } from './registry';
export {
  GroupedAttachmentRow,
  type GroupedAttachmentRowAction,
  type GroupedAttachmentRowProps,
} from './grouped_attachment_row';
export {
  GroupedAttachmentsSection,
  type GroupedAttachmentsSectionProps,
} from './grouped_attachments_section';
