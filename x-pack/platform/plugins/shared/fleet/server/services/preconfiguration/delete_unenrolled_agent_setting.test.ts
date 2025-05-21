/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { settingsService } from '..';

import { ensureDeleteUnenrolledAgentsSetting } from './delete_unenrolled_agent_setting';

jest.mock('..', () => ({
  settingsService: {
    getSettingsOrUndefined: jest.fn(),
    saveSettings: jest.fn(),
  },
}));

describe('delete_unenrolled_agent_setting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update settings with delete_unenrolled_agents enabled', async () => {
    await ensureDeleteUnenrolledAgentsSetting({} as any, true);

    expect(settingsService.saveSettings).toHaveBeenCalledWith(
      expect.anything(),
      { delete_unenrolled_agents: { enabled: true, is_preconfigured: true } },
      { fromSetup: true }
    );
  });

  it('should update settings with delete_unenrolled_agents disabled', async () => {
    await ensureDeleteUnenrolledAgentsSetting({} as any, false);

    expect(settingsService.saveSettings).toHaveBeenCalledWith(
      expect.anything(),
      { delete_unenrolled_agents: { enabled: false, is_preconfigured: true } },
      { fromSetup: true }
    );
  });

  it('should update settings when previously preconfigured', async () => {
    (settingsService.getSettingsOrUndefined as jest.Mock).mockResolvedValue({
      delete_unenrolled_agents: {
        enabled: false,
        is_preconfigured: true,
      },
    });
    await ensureDeleteUnenrolledAgentsSetting({} as any);

    expect(settingsService.saveSettings).toHaveBeenCalledWith(
      expect.anything(),
      { delete_unenrolled_agents: { enabled: false, is_preconfigured: false } },
      { fromSetup: true }
    );
  });

  it('should not update settings when previously not preconfigured', async () => {
    (settingsService.getSettingsOrUndefined as jest.Mock).mockResolvedValue({
      delete_unenrolled_agents: {
        enabled: false,
        is_preconfigured: false,
      },
    });
    await ensureDeleteUnenrolledAgentsSetting({} as any);

    expect(settingsService.saveSettings).not.toHaveBeenCalled();
  });
});
