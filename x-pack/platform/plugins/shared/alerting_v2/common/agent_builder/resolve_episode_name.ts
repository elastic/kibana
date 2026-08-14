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
  groupName?: string;
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

/** Nested path, or a single flattened top-level key such as `host.name`. */
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

const collectStringLeaves = (value: unknown, skipKeys?: ReadonlySet<string>): string[] => {
  if (typeof value === 'string') {
    const text = value.trim();
    return text === '' ? [] : [text];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStringLeaves(item));
  }
  if (isPlainObject(value)) {
    return Object.entries(value).flatMap(([key, nested]) =>
      skipKeys?.has(key) ? [] : collectStringLeaves(nested)
    );
  }
  return [];
};

const formatGroupingValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  return collectStringLeaves(value).join(', ');
};

export const resolveGroupNameFromEpisodeData = (
  episodeData?: string | null,
  groupingFields?: readonly string[]
): string | undefined => {
  const data = parseEpisodeData(episodeData);

  if (groupingFields && groupingFields.length > 0) {
    const values = groupingFields.map((field) => formatGroupingValue(getByPath(data, field)));
    const nonEmpty = values.filter((value) => value !== '');
    return nonEmpty.length > 0 ? nonEmpty.join(GROUP_NAME_SEPARATOR) : undefined;
  }

  const values = collectStringLeaves(data, new Set(['rule_name']));
  return values.length > 0 ? values.join(GROUP_NAME_SEPARATOR) : undefined;
};

const firstNonEmpty = (...values: Array<string | undefined>): string | undefined => {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
};

/**
 * Temporary episode display name from the rule name and/or grouping values.
 * Replace this once episodes have a first-class name of their own.
 */
export const resolveEpisodeName = ({
  ruleName,
  groupName,
  episodeData,
  groupingFields,
}: ResolveEpisodeNameParams = {}): string | undefined => {
  const data = parseEpisodeData(episodeData);
  const resolvedRuleName = firstNonEmpty(
    ruleName,
    typeof data.rule_name === 'string' ? data.rule_name : undefined
  );
  const resolvedGroupName = firstNonEmpty(
    groupName,
    groupingFields && groupingFields.length > 0
      ? resolveGroupNameFromEpisodeData(episodeData, groupingFields)
      : undefined,
    resolvedRuleName ? undefined : resolveGroupNameFromEpisodeData(episodeData)
  );

  if (resolvedRuleName && resolvedGroupName) {
    return i18n.translate('xpack.alertingV2.episodeAttachment.episodeNameFromRuleAndGroup', {
      defaultMessage: '{ruleName} alert for {groupName}',
      values: { ruleName: resolvedRuleName, groupName: resolvedGroupName },
    });
  }

  const name = resolvedRuleName ?? resolvedGroupName;
  if (!name) {
    return undefined;
  }

  return i18n.translate('xpack.alertingV2.episodeAttachment.episodeName', {
    defaultMessage: '{name} alert',
    values: { name },
  });
};
