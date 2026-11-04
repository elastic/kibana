/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, uiSettingsServiceMock } from '@kbn/core/server/mocks';
import type { UiSettingsParams } from '@kbn/core/server';
import { getDateFormatSettings } from '@kbn/core-ui-settings-server-internal/src/settings/date_formats';
import { FieldFormatsPlugin } from '@kbn/field-formats-plugin/server/plugin';
import { getUiSettings } from '@kbn/field-formats-plugin/server/ui_settings';
import type { KitServices } from './create_kit';
import { createKitServices } from './create_kit';

/**
 * Kit services over Kibana's own server field formats, with the defaults Kibana registers for its
 * settings, so tests compare against what a stock Kibana formats.
 */
export const createTestKitServices = async (
  overrides: Record<string, unknown> = {}
): Promise<KitServices> => {
  const registered: Record<string, UiSettingsParams<unknown>> = {
    ...getDateFormatSettings(),
    ...getUiSettings(),
  };
  const values: Record<string, unknown> = {
    ...Object.fromEntries(Object.entries(registered).map(([key, { value }]) => [key, value])),
    ...overrides,
  };
  const uiSettings = uiSettingsServiceMock.createClient();
  uiSettings.getAll.mockResolvedValue(values);
  uiSettings.getRegistered.mockReturnValue(registered);
  uiSettings.get.mockImplementation(async (key: string) => values[key]);
  const fieldFormats = new FieldFormatsPlugin(coreMock.createPluginInitializerContext()).start(
    coreMock.createStart()
  );
  return createKitServices(uiSettings, fieldFormats);
};
