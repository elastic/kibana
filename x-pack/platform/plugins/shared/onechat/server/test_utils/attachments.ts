/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { AttachmentFormatContext } from '@kbn/onechat-server/attachments';

type AttachmentFormatContextMock = AttachmentFormatContext;

export const createFormatContextMock = (): AttachmentFormatContextMock => {
  return {
    spaceId: 'default',
    request: httpServerMock.createKibanaRequest(),
  };
};
