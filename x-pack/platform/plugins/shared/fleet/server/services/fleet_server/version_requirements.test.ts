/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import { appContextService } from '..';
import { settingsService } from '..';

import type { MockedFleetAppContext } from '../../mocks';
import { createAppContextStartContractMock } from '../../mocks';

import { checkFleetServerVersionsForSecretsStorage } from '.';

import { isFleetServerVersionRequirementMet } from './version_requirements';

// Stub the two modules that version_requirements.ts imports from the same package tree.
// Both `appContextService` and `settingsService` come from '..' (the services barrel), so
// we use the real appContextService (started via createAppContextStartContractMock) and mock
// only settingsService and the fleet_server/index exports.
jest.mock('.'); // fleet_server/index — stubs checkFleetServerVersionsForSecretsStorage
jest.mock('../settings'); // services barrel re-exports `import * as settingsService from './settings'`

const mockedCheckFleetServerVersions =
  checkFleetServerVersionsForSecretsStorage as jest.MockedFunction<
    typeof checkFleetServerVersionsForSecretsStorage
  >;
const mockedGetSettingsOrUndefined = settingsService.getSettingsOrUndefined as jest.MockedFunction<
  typeof settingsService.getSettingsOrUndefined
>;
const mockedSaveSettings = settingsService.saveSettings as jest.MockedFunction<
  typeof settingsService.saveSettings
>;

describe('isFleetServerVersionRequirementMet', () => {
  let mockContext: MockedFleetAppContext;

  const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
  const soClientMock = savedObjectsClientMock.create();

  const BASE_OPTS = {
    esClient: esClientMock,
    soClient: soClientMock,
    featureName: 'OTLP output',
    minimumFleetServerVersion: '9.6.0',
    settingKey: 'otlp_output_requirements_met' as const,
  };

  beforeEach(() => {
    mockContext = createAppContextStartContractMock();
    appContextService.start(mockContext);
    // Default: latch not set, version check fails
    mockedGetSettingsOrUndefined.mockResolvedValue(undefined);
    mockedCheckFleetServerVersions.mockResolvedValue(false);
    mockedSaveSettings.mockResolvedValue({} as any);
  });

  afterEach(() => {
    appContextService.stop();
    jest.clearAllMocks();
  });

  it('returns true immediately for standalone Fleet Server without calling ES', async () => {
    appContextService.start(
      createAppContextStartContractMock({ internal: { fleetServerStandalone: true } } as any)
    );

    const result = await isFleetServerVersionRequirementMet(BASE_OPTS);

    expect(result).toBe(true);
    expect(mockedCheckFleetServerVersions).not.toHaveBeenCalled();
    expect(mockedSaveSettings).not.toHaveBeenCalled();
  });

  it('returns true from the latch without calling the version check', async () => {
    mockedGetSettingsOrUndefined.mockResolvedValue({
      otlp_output_requirements_met: true,
    } as any);

    const result = await isFleetServerVersionRequirementMet(BASE_OPTS);

    expect(result).toBe(true);
    expect(mockedCheckFleetServerVersions).not.toHaveBeenCalled();
  });

  it('falls through to the version check when the latch key is not set for this feature', async () => {
    // A different key is latched; the one for this feature is not.
    mockedGetSettingsOrUndefined.mockResolvedValue({
      secret_storage_requirements_met: true,
    } as any);
    mockedCheckFleetServerVersions.mockResolvedValue(false);

    const result = await isFleetServerVersionRequirementMet(BASE_OPTS);

    expect(result).toBe(false);
    expect(mockedCheckFleetServerVersions).toHaveBeenCalledTimes(1);
  });

  it('returns true and writes the latch when the settings SO is absent', async () => {
    // getSettingsOrUndefined returns undefined → the `settings &&` guard must not throw
    mockedGetSettingsOrUndefined.mockResolvedValue(undefined);
    mockedCheckFleetServerVersions.mockResolvedValue(true);

    const result = await isFleetServerVersionRequirementMet(BASE_OPTS);

    expect(result).toBe(true);
    expect(mockedSaveSettings).toHaveBeenCalledWith(soClientMock, {
      otlp_output_requirements_met: true,
    });
  });

  it('returns true and persists the latch when the version check passes', async () => {
    mockedGetSettingsOrUndefined.mockResolvedValue({ otlp_output_requirements_met: false } as any);
    mockedCheckFleetServerVersions.mockResolvedValue(true);

    const result = await isFleetServerVersionRequirementMet(BASE_OPTS);

    expect(result).toBe(true);
    expect(mockedSaveSettings).toHaveBeenCalledWith(soClientMock, {
      otlp_output_requirements_met: true,
    });
  });

  it('still returns true when saveSettings throws after a successful version check', async () => {
    mockedGetSettingsOrUndefined.mockResolvedValue(undefined);
    mockedCheckFleetServerVersions.mockResolvedValue(true);
    mockedSaveSettings.mockRejectedValue(new Error('SO write failed'));

    const result = await isFleetServerVersionRequirementMet(BASE_OPTS);

    expect(result).toBe(true); // swallowed — latch retries on next call
  });

  it('returns false and does not write the latch when the version check fails', async () => {
    mockedGetSettingsOrUndefined.mockResolvedValue(undefined);
    mockedCheckFleetServerVersions.mockResolvedValue(false);

    const result = await isFleetServerVersionRequirementMet(BASE_OPTS);

    expect(result).toBe(false);
    expect(mockedSaveSettings).not.toHaveBeenCalled();
  });

  it('forwards the minimum version string to the underlying version check', async () => {
    mockedGetSettingsOrUndefined.mockResolvedValue(undefined);
    mockedCheckFleetServerVersions.mockResolvedValue(true);

    await isFleetServerVersionRequirementMet(BASE_OPTS);

    expect(mockedCheckFleetServerVersions).toHaveBeenCalledWith(
      esClientMock,
      soClientMock,
      '9.6.0'
    );
  });
});
