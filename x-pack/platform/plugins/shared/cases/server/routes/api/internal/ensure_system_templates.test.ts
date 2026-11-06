/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMock } from '../../../client/mocks';
import { createEnsureSystemTemplatesRoute } from './ensure_system_templates';

const setup = ({ canRead, canUpdate }: { canRead: boolean; canUpdate: boolean }) => {
  const casesClient = createCasesClientMock();
  casesClient.templates.canReadOwnerTemplates.mockResolvedValue(canRead);
  casesClient.templates.canUpdateOwnerConfiguration.mockResolvedValue(canUpdate);
  const ensureForSpace = jest.fn().mockResolvedValue({
    createdTemplates: [],
    createdTaskLists: [],
    addedStatuses: [],
    ownersWithoutConfiguration: [],
  });
  const route = createEnsureSystemTemplatesRoute({ ensureForSpace, getSpaceId: () => 'space-1' });
  const context = { cases: Promise.resolve({ getCasesClient: async () => casesClient }) };
  const response = { ok: jest.fn((value) => value) };
  const call = (body: unknown) =>
    // @ts-expect-error: only what the handler reads
    route.handler({ context, request: { body }, response });
  return { ensureForSpace, response, call };
};

describe('POST /internal/cases/system_templates/_ensure', () => {
  it('adds the statuses only for someone who can change the Cases settings', async () => {
    const reader = setup({ canRead: true, canUpdate: false });
    await reader.call({ owner: 'securitySolution' });
    expect(reader.ensureForSpace).toHaveBeenCalledWith('space-1', 'securitySolution', {
      addStatuses: false,
    });

    const admin = setup({ canRead: true, canUpdate: true });
    await admin.call({ owner: 'securitySolution' });
    expect(admin.ensureForSpace).toHaveBeenCalledWith('space-1', 'securitySolution', {
      addStatuses: true,
    });
  });

  it("writes nothing for someone who can't read the owner's templates, or a bad body", async () => {
    const outsider = setup({ canRead: false, canUpdate: false });
    await expect(outsider.call({ owner: 'securitySolution' })).rejects.toThrow(
      'Unauthorized to read securitySolution templates'
    );
    await expect(outsider.call({})).rejects.toThrow('[owner]');
    expect(outsider.ensureForSpace).not.toHaveBeenCalled();
  });
});
