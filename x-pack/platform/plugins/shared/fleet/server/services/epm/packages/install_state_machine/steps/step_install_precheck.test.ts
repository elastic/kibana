/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getILMPolicies,
  saveILMMigrationChanges,
} from '../../../elasticsearch/template/default_settings';

import { stepInstallPrecheck } from './step_install_precheck';
import { ensureFleetGlobalEsAssets } from '../../../../setup/ensure_fleet_global_es_assets';

jest.mock('../../../..');
jest.mock('../../../../setup/ensure_fleet_global_es_assets');
jest.mock('../../../elasticsearch/template/default_settings', () => ({
  ...jest.requireActual('../../../elasticsearch/template/default_settings'),
  getILMMigrationStatus: jest.fn().mockResolvedValue(new Map()),
  getILMPolicies: jest.fn().mockResolvedValue(new Map()),
  saveILMMigrationChanges: jest.fn(),
}));

describe('stepInstallPrecheck', () => {
  const mockGetILMPolicies = getILMPolicies as jest.Mock;
  const mockSaveILMMigrationChanges = saveILMMigrationChanges as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use new ILM policy when policies not modified', async () => {
    mockGetILMPolicies.mockResolvedValueOnce(
      new Map([
        [
          'logs',
          {
            deprecatedILMPolicy: { version: 1 },
            newILMPolicy: { version: 1 },
          },
        ],
      ])
    );

    await stepInstallPrecheck();

    expect(mockSaveILMMigrationChanges).toHaveBeenCalledWith(
      new Map([
        ['logs', 'success'],
        ['metrics', 'success'],
        ['synthetics', 'success'],
      ])
    );
  });

  it('should use new ILM policy when deprecated policy does not exist', async () => {
    mockGetILMPolicies.mockResolvedValueOnce(
      new Map([
        [
          'logs',
          {
            deprecatedILMPolicy: undefined,
            newILMPolicy: { version: 2 },
          },
        ],
      ])
    );

    await stepInstallPrecheck();

    expect(mockSaveILMMigrationChanges).toHaveBeenCalledWith(
      new Map([
        ['logs', 'success'],
        ['metrics', 'success'],
        ['synthetics', 'success'],
      ])
    );
  });

  it('should fall back to deprecated logs ILM policy when both modified and deprecated one is used', async () => {
    mockGetILMPolicies.mockResolvedValueOnce(
      new Map([
        [
          'logs',
          {
            deprecatedILMPolicy: {
              version: 2,
              in_use_by: {
                composable_templates: [{}],
              },
            },
            newILMPolicy: { version: 2 },
          },
        ],
      ])
    );

    await stepInstallPrecheck();

    expect(mockSaveILMMigrationChanges).toHaveBeenCalledWith(
      new Map([
        ['metrics', 'success'],
        ['synthetics', 'success'],
      ])
    );
  });

  it('should use new ILM policy when deprecated policy is not used', async () => {
    mockGetILMPolicies.mockResolvedValueOnce(
      new Map([
        [
          'logs',
          {
            deprecatedILMPolicy: {
              version: 2,
              in_use_by: {
                composable_templates: [],
              },
            },
            newILMPolicy: { version: 2 },
          },
        ],
      ])
    );

    await stepInstallPrecheck();

    expect(mockSaveILMMigrationChanges).toHaveBeenCalledWith(
      new Map([
        ['logs', 'success'],
        ['metrics', 'success'],
        ['synthetics', 'success'],
      ])
    );
  });

  it('should call ensureFleetGlobalEsAssets', async () => {
    await stepInstallPrecheck();

    expect(jest.mocked(ensureFleetGlobalEsAssets)).toHaveBeenCalled();
  });
});
