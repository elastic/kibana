/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTopLevelAppEnabled } from '../../common/top_level_app';
import type { CasePostRequestWithOptionalOwner } from './resolve_owner';
import { resolveCaseOwner } from './resolve_owner';

const request = { title: 'case' } as CasePostRequestWithOptionalOwner;
const getTemplateOwner = jest.fn();

describe('resolveCaseOwner', () => {
  beforeEach(() => {
    getTemplateOwner.mockReset();
  });

  describe('with the top-level app', () => {
    beforeAll(() => setTopLevelAppEnabled(true));
    afterAll(() => setTopLevelAppEnabled(false));

    it('uses the owner of the request first', async () => {
      await expect(
        resolveCaseOwner({
          request: { ...request, owner: 'observability', template: { id: 't' } },
          registeredOwners: ['cases'],
          getTemplateOwner,
        })
      ).resolves.toBe('observability');
      expect(getTemplateOwner).not.toHaveBeenCalled();
    });

    it("falls back to the template's owner", async () => {
      getTemplateOwner.mockResolvedValue('securitySolution');
      await expect(
        resolveCaseOwner({
          request: { ...request, template: { id: 't' } },
          registeredOwners: ['cases', 'securitySolution'],
          getTemplateOwner,
        })
      ).resolves.toBe('securitySolution');
    });

    it('falls back to the only registered owner', async () => {
      getTemplateOwner.mockResolvedValue(undefined);
      await expect(
        resolveCaseOwner({
          request: { ...request, template: { id: 'missing' } },
          registeredOwners: ['observability'],
          getTemplateOwner,
        })
      ).resolves.toBe('observability');
    });

    it('falls back to the stack owner when several owners exist', async () => {
      await expect(
        resolveCaseOwner({
          request,
          registeredOwners: ['securitySolution', 'cases', 'observability'],
          getTemplateOwner,
        })
      ).resolves.toBe('cases');
    });

    it('asks for an owner when it cannot pick one', async () => {
      await expect(
        resolveCaseOwner({
          request,
          registeredOwners: ['securitySolution', 'observability'],
          getTemplateOwner,
        })
      ).rejects.toThrow(
        'Specify the owner of the case. It must be one of: securitySolution, observability.'
      );
    });
  });

  it('requires the owner when the top-level app is off', async () => {
    await expect(
      resolveCaseOwner({ request, registeredOwners: ['cases'], getTemplateOwner })
    ).rejects.toThrow('Owner is required.');
  });
});
