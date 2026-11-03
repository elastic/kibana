/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INVALID_JSON_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.sections.buildConnectorFlyout.error.invalidJson',
  { defaultMessage: 'Must be valid JSON.' }
);

export const NOT_A_JSON_OBJECT_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.sections.buildConnectorFlyout.error.notAJsonObject',
  { defaultMessage: 'Must be a JSON object.' }
);

interface ParsedJsonObject {
  value?: Record<string, unknown>;
  error?: string;
}

/** Parses request body text; empty text is valid and yields no value. */
export const parseJsonObject = (text: string): ParsedJsonObject => {
  if (!text.trim()) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: INVALID_JSON_MESSAGE };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { error: NOT_A_JSON_OBJECT_MESSAGE };
  }
  return { value: parsed as Record<string, unknown> };
};

export const formatJson = (text: string): string => JSON.stringify(JSON.parse(text), null, 2);
