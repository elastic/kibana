/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DISCOVER_SESSION_ATTACHMENT_TYPE,
  DISCOVER_SESSION_SO_TYPE,
} from '../../../../common/constants/attachments';
import type { DiscoverSessionAttachmentPayload } from '../../../../common/types/domain_zod/attachment/saved_object/v2';

export type DiscoverSessionPayload = Omit<DiscoverSessionAttachmentPayload, 'owner'>;

export const buildDiscoverSessionPayload = ({
  id,
  title,
}: {
  id: string;
  title: string;
}): DiscoverSessionPayload => ({
  type: DISCOVER_SESSION_ATTACHMENT_TYPE,
  attachmentId: id,
  metadata: { title, soType: DISCOVER_SESSION_SO_TYPE },
});
