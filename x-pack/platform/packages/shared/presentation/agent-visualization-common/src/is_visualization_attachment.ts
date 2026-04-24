/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { VISUALIZATION_ATTACHMENT_TYPE } from './constants';
import type { VisualizationAttachmentData } from './types';

export const isVisualizationAttachment = (
  attachment: VersionedAttachment
): attachment is VersionedAttachment<
  typeof VISUALIZATION_ATTACHMENT_TYPE,
  VisualizationAttachmentData
> => attachment.type === VISUALIZATION_ATTACHMENT_TYPE;
