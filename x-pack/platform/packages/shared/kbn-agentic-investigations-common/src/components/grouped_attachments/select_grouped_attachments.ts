/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment, VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getActiveAttachments } from '@kbn/agent-builder-common/attachments';
import type { ComponentType } from 'react';
import { toRenderAttachment } from './to_render_attachment';
import type {
  FlyoutGroupedAttachmentRendererProps,
  FlyoutGroupedAttachments,
  FlyoutGroupedAttachmentsRegistry,
} from './types';

export interface SelectedGroupedAttachments {
  group: FlyoutGroupedAttachments;
  renderer: ComponentType<FlyoutGroupedAttachmentRendererProps>;
  attachments: UnknownAttachment[];
}

/** The registered groups that have active, non-hidden attachments, in `order`. */
export const selectGroupedAttachments = (
  attachments: VersionedAttachment[] | undefined,
  registry: FlyoutGroupedAttachmentsRegistry,
  order: readonly FlyoutGroupedAttachments[]
): SelectedGroupedAttachments[] => {
  const renderable = getActiveAttachments(attachments ?? [])
    .filter((attachment) => !attachment.hidden)
    .map(toRenderAttachment);

  return order.flatMap((group): SelectedGroupedAttachments[] => {
    const definition = registry.get(group);
    if (!definition) {
      return [];
    }
    const groupAttachments = renderable.filter(({ type }) =>
      definition.attachmentTypes.includes(type)
    );
    return groupAttachments.length > 0
      ? [{ group, renderer: definition.renderer, attachments: groupAttachments }]
      : [];
  });
};
