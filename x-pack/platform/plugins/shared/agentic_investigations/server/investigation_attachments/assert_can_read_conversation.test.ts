/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import { InvestigationsForbiddenError } from '../investigations/services/investigations_forbidden_error';
import { createConversationReadCheck } from './assert_can_read_conversation';

const request = httpServerMock.createKibanaRequest();

const checkWith = (readable: string[]) => {
  const bulkGet = jest.fn(
    async (ids: string[]) =>
      new Map(ids.filter((id) => readable.includes(id)).map((id) => [id, { id }]))
  );
  const check = createConversationReadCheck({
    getConversationClient: async () => ({ bulkGet } as unknown as ConversationPublicClient),
  });
  return { check, bulkGet };
};

describe('createConversationReadCheck', () => {
  it('passes when the caller can read the conversation', async () => {
    const { check, bulkGet } = checkWith(['conv-1']);

    await expect(check(request, 'conv-1')).resolves.toBeUndefined();
    expect(bulkGet).toHaveBeenCalledWith(['conv-1']);
  });

  it('throws when Agent Builder omits the conversation for the caller', async () => {
    const { check } = checkWith([]);

    await expect(check(request, 'private-conv')).rejects.toBeInstanceOf(
      InvestigationsForbiddenError
    );
  });
});
