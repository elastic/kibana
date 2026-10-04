/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import { DefaultAttachmentGroupRenderer } from './renderers/default_attachment_group_renderer';
import { getAttachmentGroupRenderer } from './registry';
import { AttachmentGroupErrorBoundary } from './attachment_group_error_boundary';
import type { AttachmentGroup } from './types';

export interface RenderAttachmentGroupListProps {
  group: AttachmentGroup;
  attachmentsService: AttachmentServiceStartContract;
}

/** Renders one attachment group using the custom renderer registered for its id, falling back to the default. */
export const RenderAttachmentGroupList = ({
  group,
  attachmentsService,
}: RenderAttachmentGroupListProps) => {
  const CustomRenderer = getAttachmentGroupRenderer(group.id);

  if (!CustomRenderer) {
    return <DefaultAttachmentGroupRenderer group={group} attachmentsService={attachmentsService} />;
  }

  return (
    <AttachmentGroupErrorBoundary
      fallback={
        <DefaultAttachmentGroupRenderer group={group} attachmentsService={attachmentsService} />
      }
    >
      <Suspense
        fallback={
          <DefaultAttachmentGroupRenderer group={group} attachmentsService={attachmentsService} />
        }
      >
        <CustomRenderer group={group} attachmentsService={attachmentsService} />
      </Suspense>
    </AttachmentGroupErrorBoundary>
  );
};
