/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OSQUERY_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

import { osqueryUnifiedAttachment } from '.';
import { OsqueryAttachmentPayloadSchema } from '../../../common/cases/attachments/schema';

describe('osqueryUnifiedAttachment', () => {
  it('exposes the `osquery` unified attachment type with the zod schema', () => {
    expect(osqueryUnifiedAttachment).toEqual({
      id: OSQUERY_ATTACHMENT_TYPE,
      schema: OsqueryAttachmentPayloadSchema,
    });
  });
});
