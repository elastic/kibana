/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { IFieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { FORMATS_UI_SETTINGS } from '@kbn/field-formats-plugin/common';
import type { MaterializeContext } from '../../../common';
import type { MaterializeKit } from '../types';
import { toChartData } from './chart_data';
import { paletteColors } from './colors';
import type { FormatSettings } from './formats';
import { createFormatMapper } from './formats';

/** What a kit formats with, read once per request. */
export interface KitServices {
  registry: IFieldFormatsRegistry;
  settings: FormatSettings;
}

/** Reads the user's field formats and settings, as Kibana's server formats with them. */
export const createKitServices = async (
  uiSettings: IUiSettingsClient,
  fieldFormats: Pick<FieldFormatsStart, 'fieldFormatServiceFactory'>
): Promise<KitServices> => {
  const [registry, dateFormatTz, numberLocale] = await Promise.all([
    fieldFormats.fieldFormatServiceFactory(uiSettings),
    uiSettings.get<string>('dateFormat:tz'),
    uiSettings.get<string>(FORMATS_UI_SETTINGS.FORMAT_NUMBER_DEFAULT_LOCALE),
  ]);
  return { registry, settings: { dateFormatTz, numberLocale } };
};

/** The helpers a materializer maps with, for one context. */
export const createMaterializeKit = (
  { registry, settings }: KitServices,
  context: MaterializeContext
): MaterializeKit => {
  const mapFormat = createFormatMapper(registry, settings);
  return {
    context,
    toPortableFormat: (format, type) => mapFormat(format, type, context.timeZone),
    toChartData: (table, options) => toChartData(table, mapFormat, context.timeZone, options),
    paletteColors,
  };
};
