/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ImpactPrivilegesChecker } from './check_impact_privileges';
import { ImpactForbiddenError } from './errors';
import { createImpactClient } from './impact_client';
import type { ImpactService } from './impact_service';

const request = httpServerMock.createKibanaRequest();

const createClient = ({
  listByConversationIds = jest.fn().mockResolvedValue([]),
  assertCanRead = jest.fn().mockResolvedValue(undefined),
  getSpaceId = jest.fn().mockReturnValue('space-from-request'),
}: {
  listByConversationIds?: jest.Mock;
  assertCanRead?: jest.Mock;
  getSpaceId?: jest.Mock;
} = {}) => {
  const privileges: ImpactPrivilegesChecker = {
    assertCanRead,
    assertCanManage: jest.fn(),
  };
  const client = createImpactClient({
    getImpactService: () => ({ listByConversationIds } as unknown as ImpactService),
    getSpaceId,
    privileges,
  })(request);

  return { client, listByConversationIds, assertCanRead, getSpaceId };
};

describe('createImpactClient', () => {
  it('should read in the request space after the privilege check', async () => {
    const { client, listByConversationIds, assertCanRead, getSpaceId } = createClient();

    await client.listByConversationIds(['c1', 'c2']);

    expect(assertCanRead).toHaveBeenCalledWith(request);
    expect(getSpaceId).toHaveBeenCalledWith(request);
    expect(listByConversationIds).toHaveBeenCalledWith(['c1', 'c2'], 'space-from-request');
  });

  it('should refuse before searching when the principal cannot manage investigations', async () => {
    const { client, listByConversationIds, getSpaceId } = createClient({
      assertCanRead: jest.fn().mockRejectedValue(new ImpactForbiddenError('nope')),
    });

    await expect(client.listByConversationIds(['c1'])).rejects.toBeInstanceOf(ImpactForbiddenError);
    expect(listByConversationIds).not.toHaveBeenCalled();
    expect(getSpaceId).not.toHaveBeenCalled();
  });
});
