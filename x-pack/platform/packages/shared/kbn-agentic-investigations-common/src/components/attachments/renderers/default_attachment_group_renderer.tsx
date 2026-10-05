/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { AttachmentGroupList } from '../attachment_group_list';
import { AttachmentRow } from '../attachment_row';
import type { AttachmentGroupRendererProps } from '../types';

/**
 * Fallback renderer for groups that have no registered custom renderer.
 * Shows a header and a read-only row per attachment.
 */
export const DefaultAttachmentGroupRenderer = memo<AttachmentGroupRendererProps>(
  ({ group, attachmentsService }) => {
    const title = group.title ?? group.id;

    const rows = group.attachments.map((attachment) => {
      let label: string = attachment.description ?? group.id;
      try {
        const definition = attachmentsService.getAttachmentUiDefinition(attachment.type);
        if (definition) {
          label = definition.getLabel(attachment);
        }
      } catch {
        // getLabel should never throw, but guard anyway so one bad attachment
        // doesn't collapse the whole group.
      }

      return (
        <AttachmentRow key={attachment.id} label={label} typeName={title} iconType="document" />
      );
    });

    return <AttachmentGroupList title={title} rows={rows} />;
  }
);

DefaultAttachmentGroupRenderer.displayName = 'DefaultAttachmentGroupRenderer';
