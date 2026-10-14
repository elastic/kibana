/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnifiedAttachmentTypeSetup } from '@kbn/cases-plugin/server';
import { OSQUERY_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { OsqueryAttachmentPayloadSchema } from '../../../common/cases/attachments/schema';

export const osqueryUnifiedAttachment: UnifiedAttachmentTypeSetup = {
  id: OSQUERY_ATTACHMENT_TYPE,
  schema: OsqueryAttachmentPayloadSchema,
};
