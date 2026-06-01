/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { syncAgentBuilderOverviewDashboard } from './install_dashboard';
import { AGENT_BUILDER_OVERVIEW_DASHBOARD_ID } from './constants';

jest.mock('@kbn/lens-embeddable-utils', () => ({
  LensConfigBuilder: jest.fn().mockImplementation(() => ({
    fromAPIFormat: jest.fn((config) => config),
  })),
}));

const mockInternalRepo = savedObjectsRepositoryMock.create();
const mockUiSettingsClient = uiSettingsServiceMock.createClient();

describe('syncAgentBuilderOverviewDashboard', () => {
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUiSettingsClient.get.mockResolvedValue(false);
  });

  it('installs the overview dashboard when experimental features are enabled', async () => {
    mockUiSettingsClient.get.mockImplementation(async (key) => {
      if (key === AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID) {
        return true;
      }
      return false;
    });

    const coreStart = coreMock.createStart();
    coreStart.savedObjects.createInternalRepository.mockReturnValue(mockInternalRepo);
    coreStart.uiSettings.asScopedToClient.mockReturnValue(mockUiSettingsClient);

    await syncAgentBuilderOverviewDashboard(coreStart, logger);

    expect(mockInternalRepo.create).toHaveBeenCalledWith(
      'dashboard',
      expect.objectContaining({
        title: '[Elastic] Agent Builder Overview',
        panelsJSON: expect.stringContaining('data_stream.namespace == \\"default\\"'),
      }),
      expect.objectContaining({
        id: AGENT_BUILDER_OVERVIEW_DASHBOARD_ID,
        managed: true,
        overwrite: true,
      })
    );
    expect(mockInternalRepo.delete).not.toHaveBeenCalled();
  });

  it('removes the overview dashboard when experimental features are disabled', async () => {
    const coreStart = coreMock.createStart();
    coreStart.savedObjects.createInternalRepository.mockReturnValue(mockInternalRepo);
    coreStart.uiSettings.asScopedToClient.mockReturnValue(mockUiSettingsClient);

    await syncAgentBuilderOverviewDashboard(coreStart, logger);

    expect(mockInternalRepo.delete).toHaveBeenCalledWith(
      'dashboard',
      AGENT_BUILDER_OVERVIEW_DASHBOARD_ID
    );
    expect(mockInternalRepo.create).not.toHaveBeenCalled();
  });
});
