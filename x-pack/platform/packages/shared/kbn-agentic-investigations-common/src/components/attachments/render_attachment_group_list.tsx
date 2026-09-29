/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import { DefaultAttachmentGroupRenderer } from './renderers/default_attachment_group_renderer';
import type { AttachmentGroup } from './types';

export interface RenderAttachmentGroupListProps {
  group: AttachmentGroup;
  attachmentsService: AttachmentServiceStartContract;
}

/** Renders one attachment group using the default renderer. Custom renderers are added in step 2+. */
export const RenderAttachmentGroupList = ({
  group,
  attachmentsService,
}: RenderAttachmentGroupListProps) => (
  <DefaultAttachmentGroupRenderer group={group} attachmentsService={attachmentsService} />
);
