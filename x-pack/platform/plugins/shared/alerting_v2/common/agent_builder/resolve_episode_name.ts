/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const GROUP_NAME_SEPARATOR = ' · ';

export interface ResolveEpisodeNameParams {
  ruleName?: string;
  episodeData?: string | null;
  groupingFields?: readonly string[];
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseEpisodeData = (raw?: string | null): Record<string, unknown> => {
  if (!raw) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

/** Reads a flattened top-level key or a nested dotted path. */
const getByPath = (data: Record<string, unknown>, field: string): unknown => {
  if (Object.hasOwn(data, field)) {
    return data[field];
  }

  return field.split('.').reduce<unknown>((acc, key) => {
    if (isPlainObject(acc) && Object.hasOwn(acc, key)) {
      return acc[key];
    }
    return undefined;
  }, data);
};

const resolveGroupName = (
  episodeData?: string | null,
  groupingFields?: readonly string[]
): string | undefined => {
  if (!groupingFields?.length || !episodeData) {
    return undefined;
  }

  const data = parseEpisodeData(episodeData);
  const values = groupingFields
    .map((field) => getByPath(data, field))
    .filter(
      (v): v is string | number | boolean =>
        typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
    )
    .map((v) => String(v).trim())
    .filter(Boolean);

  return values.length > 0 ? values.join(GROUP_NAME_SEPARATOR) : undefined;
};

/**
 * Temporary episode display name from the rule name and/or grouping values.
 * Replace this once episodes have a first-class name of their own.
 */
export const resolveEpisodeName = ({
  ruleName,
  episodeData,
  groupingFields,
}: ResolveEpisodeNameParams = {}): string | undefined => {
  const resolvedRuleName = ruleName?.trim() || undefined;
  const groupName = resolveGroupName(episodeData, groupingFields);

  if (resolvedRuleName && groupName) {
    return i18n.translate('xpack.alertingV2.episodeAttachment.episodeNameFromRuleAndGroup', {
      defaultMessage: '{ruleName} alert for {groupName}',
      values: { ruleName: resolvedRuleName, groupName },
    });
  }

  const name = resolvedRuleName ?? groupName;
  return name
    ? i18n.translate('xpack.alertingV2.episodeAttachment.episodeName', {
        defaultMessage: '{name} alert',
        values: { name },
      })
    : undefined;
};
