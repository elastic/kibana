/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  CASES_SPACE_SETTINGS_ID,
  GENERAL_CASES_OWNER,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import type {
  CaseStatusDefinition,
  CasesSpaceSettings,
} from '../../../common/types/domain/space_settings/v1';
import { DEFAULT_CASE_STATUSES } from '../../../common/utils/statuses';
import { Operations } from '../../authorization';
import { setCustomStatusesEnabled } from '../../common/custom_statuses';
import { createCasesClientMockArgs } from '../mocks';
import { createSpaceSettingsSubClient } from './client';

const triage: CaseStatusDefinition = {
  key: 'triage',
  label: 'Triage',
  color: 'accent',
  category: 'not_started',
  order: 3,
  isDefault: false,
  disabled: false,
};

const settings: CasesSpaceSettings = { statuses: [...DEFAULT_CASE_STATUSES, triage] };

describe('space settings client', () => {
  const clientArgs = createCasesClientMockArgs();
  const client = createSpaceSettingsSubClient(clientArgs);
  const { spaceSettingsService } = clientArgs.services;

  beforeEach(() => {
    jest.clearAllMocks();
    setCustomStatusesEnabled(true);
    clientArgs.authorization.getSpaceOwners.mockReturnValue([
      GENERAL_CASES_OWNER,
      SECURITY_SOLUTION_OWNER,
    ]);
    spaceSettingsService.getStatuses.mockResolvedValue([...DEFAULT_CASE_STATUSES]);
    spaceSettingsService.put.mockImplementation(async (saved) => saved);
  });

  afterAll(() => {
    setCustomStatusesEnabled(false);
  });

  describe('get', () => {
    it('returns the default statuses when the space saved none', async () => {
      await expect(client.get()).resolves.toEqual({ statuses: [...DEFAULT_CASE_STATUSES] });
      expect(clientArgs.authorization.getAuthorizationFilter).toHaveBeenCalledWith(
        Operations.findConfigurations
      );
    });

    it('returns the statuses while custom statuses are off', async () => {
      setCustomStatusesEnabled(false);
      spaceSettingsService.getStatuses.mockResolvedValue(settings.statuses);

      await expect(client.get()).resolves.toEqual(settings);
    });

    it('fails when the user cannot read any configuration', async () => {
      clientArgs.authorization.getAuthorizationFilter.mockRejectedValueOnce(
        Boom.forbidden('Unauthorized')
      );

      await expect(client.get()).rejects.toThrow('Unauthorized');
      expect(spaceSettingsService.getStatuses).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('saves the statuses and returns them', async () => {
      await expect(client.update(settings)).resolves.toEqual(settings);
      expect(spaceSettingsService.put).toHaveBeenCalledWith(settings);
    });

    it('requires the settings privilege of every owner in the space', async () => {
      await client.update(settings);

      expect(clientArgs.authorization.ensureAuthorized).toHaveBeenCalledWith({
        operation: Operations.updateConfiguration,
        entities: [
          { owner: GENERAL_CASES_OWNER, id: CASES_SPACE_SETTINGS_ID },
          { owner: SECURITY_SOLUTION_OWNER, id: CASES_SPACE_SETTINGS_ID },
        ],
      });
    });

    it('does not save when the user lacks the settings privilege of an owner', async () => {
      clientArgs.authorization.ensureAuthorized.mockRejectedValueOnce(
        Boom.forbidden('Unauthorized')
      );

      await expect(client.update(settings)).rejects.toThrow('Unauthorized');
      expect(spaceSettingsService.put).not.toHaveBeenCalled();
    });

    it('returns 403 when no owner is enabled in the space', async () => {
      clientArgs.authorization.getSpaceOwners.mockReturnValue([]);

      await expect(client.update(settings)).rejects.toMatchObject({
        wrappedError: expect.objectContaining({
          output: expect.objectContaining({ statusCode: 403 }),
        }),
      });
      expect(spaceSettingsService.put).not.toHaveBeenCalled();
    });

    it('returns 400 while custom statuses are off', async () => {
      setCustomStatusesEnabled(false);

      await expect(client.update(settings)).rejects.toThrow('Custom statuses are turned off.');
      expect(spaceSettingsService.put).not.toHaveBeenCalled();
    });

    it('rejects a list that does not match the schema', async () => {
      await expect(
        client.update({ statuses: [{ ...triage, key: 'Not A Key' }, ...DEFAULT_CASE_STATUSES] })
      ).rejects.toMatchObject({
        wrappedError: expect.objectContaining({
          output: expect.objectContaining({ statusCode: 400 }),
        }),
      });
      expect(spaceSettingsService.put).not.toHaveBeenCalled();
    });

    it('rejects a list that breaks the status rules with every message', async () => {
      spaceSettingsService.getStatuses.mockResolvedValue(settings.statuses);

      await expect(
        client.update({
          statuses: [...DEFAULT_CASE_STATUSES.map((status) => ({ ...status, isDefault: false }))],
        })
      ).rejects.toThrow(
        [
          'Choose exactly one default status for the not_started category.',
          'Choose exactly one default status for the active category.',
          'Choose exactly one default status for the done category.',
          '"Triage" cannot be deleted. Disable it instead.',
        ].join(' ')
      );
      expect(spaceSettingsService.put).not.toHaveBeenCalled();
    });
  });
});
