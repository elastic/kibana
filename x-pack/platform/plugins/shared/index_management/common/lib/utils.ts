/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TemplateDeserialized,
  LegacyTemplateSerialized,
  TemplateSerialized,
  IndexMode,
  IndexSettings,
} from '../types';

/**
 * Builds template settings object, properly handling index mode.
 * This function:
 * - Removes any existing mode from template.settings.index
 * - Only includes the mode if indexMode parameter is provided
 * - Preserves all other settings
 * - Returns undefined if there are no settings to include
 *
 * @param template The template object containing settings
 * @param indexMode The index mode to set (if any)
 * @returns The rebuilt settings object or undefined if empty
 */
export const buildTemplateSettings = (
  template?: TemplateDeserialized['template'],
  indexMode?: IndexMode
): IndexSettings | undefined => {
  // Extract existing settings, separating index settings from other settings
  const { index: existingIndexSettings, ...otherSettings } = template?.settings || {};

  // Remove mode from existing index settings as we'll set it from indexMode parameter
  const { mode: _existingMode, ...otherIndexSettings } = existingIndexSettings || {};

  // Build index settings: include if we have indexMode to set or other index settings to preserve
  const hasIndexMode = indexMode !== undefined;
  const hasOtherIndexSettings = Object.keys(otherIndexSettings).length > 0;

  const indexSettings =
    hasIndexMode || hasOtherIndexSettings
      ? {
          ...otherIndexSettings,
          ...(hasIndexMode && { mode: indexMode }),
        }
      : undefined;

  // Build settings object: only include if we have index settings or other settings
  const settings = {
    ...otherSettings,
    ...(indexSettings && { index: indexSettings }),
  };

  // Return undefined if settings object is empty
  return Object.keys(settings).length > 0 ? settings : undefined;
};

/**
 * Helper to know if a template has the legacy format or not
 * legacy format will be supported up until 9.x but marked as deprecated from 7.8
 * new (composable) format is supported from 7.8
 */
export const isLegacyTemplate = (
  template: TemplateDeserialized | LegacyTemplateSerialized | TemplateSerialized
): boolean => {
  return {}.hasOwnProperty.call(template, 'template') ? false : true;
};

export const getTemplateParameter = (
  template: LegacyTemplateSerialized | TemplateSerialized,
  setting: 'aliases' | 'settings' | 'mappings'
) => {
  return isLegacyTemplate(template)
    ? (template as LegacyTemplateSerialized)[setting]
    : (template as TemplateSerialized).template?.[setting];
};
