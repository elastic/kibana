/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { AttachmentsTab, type AttachmentsTabProps } from './attachments_tab';
export {
  AttachmentGroupList,
  type AttachmentGroupListProps,
  DEFAULT_COLLAPSED_COUNT,
} from './attachment_group_list';
export { AttachmentRow, type AttachmentRowProps } from './attachment_row';
export { ATTACHMENT_GROUPS, type KnownAttachmentGroup } from './attachment_groups';
export { groupAttachments } from './group_attachments';
export type {
  AttachmentGroup,
  AttachmentGroupRenderer,
  AttachmentGroupRendererProps,
  AttachmentGroupRendererRegistry,
} from './types';
export { registerAttachmentGroupRenderer, getAttachmentGroupRenderer } from './registry';
