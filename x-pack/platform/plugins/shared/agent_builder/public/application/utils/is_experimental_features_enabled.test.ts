/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { settingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { isExperimentalFeaturesEnabled } from './is_experimental_features_enabled';

describe('isExperimentalFeaturesEnabled', () => {
  it('returns true when uiSettingsClient.get returns true', () => {
    const { client } = settingsServiceMock.createStartContract();
    (client.get as jest.Mock).mockReturnValue(true);

    expect(isExperimentalFeaturesEnabled(client)).toBe(true);
    expect(client.get).toHaveBeenCalledWith(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID, false);
  });

  it('returns false when uiSettingsClient.get returns false', () => {
    const { client } = settingsServiceMock.createStartContract();
    (client.get as jest.Mock).mockReturnValue(false);

    expect(isExperimentalFeaturesEnabled(client)).toBe(false);
    expect(client.get).toHaveBeenCalledWith(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID, false);
  });

  it('returns undefined when uiSettingsClient.get returns undefined', () => {
    const { client } = settingsServiceMock.createStartContract();
    (client.get as jest.Mock).mockReturnValue(undefined);

    expect(isExperimentalFeaturesEnabled(client)).toBeUndefined();
  });
});
