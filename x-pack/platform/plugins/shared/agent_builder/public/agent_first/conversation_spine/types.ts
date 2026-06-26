/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';

export type SpineType = 'chat' | 'case' | 'incident';

export type SpineTabId = 'attachments' | 'people';

export type AttachmentsPanelView =
  | { mode: 'grid' }
  | { mode: 'attachment'; attachment: UnknownAttachment };

export interface ConversationSpineRecord {
  type: SpineType;
  identifier: string;
  conversationId: string;
}

export interface ConversationSpineState {
  record: ConversationSpineRecord;
  activeTabId: SpineTabId;
  attachmentsView: AttachmentsPanelView;
  isSidebar: boolean;
}

export interface OpenSpineOptions {
  tabId?: SpineTabId;
  attachmentsView?: AttachmentsPanelView;
  isSidebar?: boolean;
}

export interface SpineTabDefinition {
  id: string;
  name: string;
  content: ReactNode;
}

export interface SpineHeaderSlots {
  beforeTitle?: ReactNode;
  afterTitle?: ReactNode;
}
