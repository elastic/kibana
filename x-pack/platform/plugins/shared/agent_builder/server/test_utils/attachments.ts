/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type {
  AttachmentFormatContext,
  AttachmentResolveContext,
} from '@kbn/agent-builder-server/attachments';

type AttachmentFormatContextMock = AttachmentFormatContext;
type AttachmentResolveContextMock = AttachmentResolveContext;

export const createFormatContextMock = (): AttachmentFormatContextMock => {
  return {
    spaceId: 'default',
    request: httpServerMock.createKibanaRequest(),
  };
};

export const createResolveContextMock = (): AttachmentResolveContextMock => {
  return {
    ...createFormatContextMock(),
    savedObjectsClient: savedObjectsClientMock.create(),
  };
};
