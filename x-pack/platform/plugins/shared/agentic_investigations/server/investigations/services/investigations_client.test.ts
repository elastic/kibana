/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { InvestigationAttachmentInvalidRequestError } from '../../investigation_attachments';
import type { InvestigationsPrivilegesChecker } from './check_investigations_privileges';
import { createInvestigationsClient } from './investigations_client';
import { InvestigationsForbiddenError } from './investigations_forbidden_error';
import type { InvestigationsQueryService } from './investigations_query_service';

const request = httpServerMock.createKibanaRequest();

const setup = (privileges: Partial<InvestigationsPrivilegesChecker> = {}) => {
  const queryService = {
    get: jest.fn().mockResolvedValue({ id: 'conv-1' }),
    list: jest.fn().mockResolvedValue({ results: [] }),
    severityCounts: jest.fn().mockResolvedValue({}),
    findOpenBySubjects: jest.fn().mockResolvedValue([]),
  };
  const deleteAllInSpace = jest.fn().mockResolvedValue({
    subjects: 1,
    subjectClaims: 1,
    impact: 1,
    hypotheses: 1,
  });
  const checker: InvestigationsPrivilegesChecker = {
    assertCanRead: jest.fn().mockResolvedValue(undefined),
    assertCanManage: jest.fn().mockResolvedValue(undefined),
    ...privileges,
  };
  const client = createInvestigationsClient({
    getQueryService: () => queryService as unknown as InvestigationsQueryService,
    getSpaceId: () => 'space-1',
    privileges: checker,
    deleteAllInSpace,
  })(request);
  return { client, queryService, deleteAllInSpace, checker };
};

describe('createInvestigationsClient', () => {
  it('applies the list defaults before reading', async () => {
    const { client, queryService, checker } = setup();

    await client.list({ status: 'open' });

    expect(checker.assertCanRead).toHaveBeenCalledWith(request);
    expect(queryService.list).toHaveBeenCalledWith(request, {
      status: ['open'],
      sort_field: 'created_at',
      sort_order: 'desc',
      page: 1,
      per_page: 20,
    });
  });

  it('rejects an invalid query as a bad request', async () => {
    const { client, queryService } = setup();

    await expect(client.list({ per_page: 1000 })).rejects.toBeInstanceOf(
      InvestigationAttachmentInvalidRequestError
    );
    expect(queryService.list).not.toHaveBeenCalled();
  });

  it('checks the read privilege before every read', async () => {
    const deny = jest.fn().mockRejectedValue(new InvestigationsForbiddenError('nope'));
    const { client, queryService } = setup({ assertCanRead: deny });

    await expect(client.get('conv-1')).rejects.toBeInstanceOf(InvestigationsForbiddenError);
    await expect(client.list()).rejects.toBeInstanceOf(InvestigationsForbiddenError);
    await expect(client.severityCounts()).rejects.toBeInstanceOf(InvestigationsForbiddenError);
    await expect(client.findOpenBySubjects([{ type: 'alert', id: 'a' }])).rejects.toBeInstanceOf(
      InvestigationsForbiddenError
    );
    expect(queryService.get).not.toHaveBeenCalled();
    expect(queryService.list).not.toHaveBeenCalled();
    expect(queryService.severityCounts).not.toHaveBeenCalled();
    expect(queryService.findOpenBySubjects).not.toHaveBeenCalled();
  });

  it('needs the manage privilege for the maintenance delete and scopes it to the request space', async () => {
    const { client, deleteAllInSpace, checker } = setup();

    await expect(client.deleteAllInSpace()).resolves.toEqual({
      subjects: 1,
      subjectClaims: 1,
      impact: 1,
      hypotheses: 1,
    });
    expect(checker.assertCanManage).toHaveBeenCalledWith(request);
    expect(deleteAllInSpace).toHaveBeenCalledWith('space-1');
  });

  it('does not delete without the manage privilege', async () => {
    const { client, deleteAllInSpace } = setup({
      assertCanManage: jest.fn().mockRejectedValue(new InvestigationsForbiddenError('nope')),
    });

    await expect(client.deleteAllInSpace()).rejects.toBeInstanceOf(InvestigationsForbiddenError);
    expect(deleteAllInSpace).not.toHaveBeenCalled();
  });
});
