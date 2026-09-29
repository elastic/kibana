/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';

/** One group of attachments, projected into the flat shape renderers consume. */
export interface AttachmentGroup {
  /** Identifier for this group, e.g. 'alert', 'rule', or the type id for ad-hoc groups. */
  id: string;
  /** Display title for the group header. Falls back to `id` when absent. */
  title?: string;
  /** Attachments belonging to this group, in chronological order. */
  attachments: UnknownAttachment[];
}

export interface AttachmentGroupRendererProps {
  group: AttachmentGroup;
  attachmentsService: AttachmentServiceStartContract;
}

/**
 * A component that renders one group of attachments. Custom renderers receive the group and
 * own everything: header, rows, expand/collapse, clicks and flyout opens.
 */
export type AttachmentGroupRenderer = React.ComponentType<AttachmentGroupRendererProps>;

/** Registry that maps group ids to custom renderers. */
export interface AttachmentGroupRendererRegistry {
  /** Register a renderer for a group id. Throws when the same id is registered twice. */
  register: (groupId: string, renderer: AttachmentGroupRenderer) => void;
  /** Returns the registered renderer for the given group id, or `undefined` if none. */
  get: (groupId: string) => AttachmentGroupRenderer | undefined;
}
