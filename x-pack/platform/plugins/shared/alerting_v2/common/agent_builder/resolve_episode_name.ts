/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { parseEpisodeDataJson, getValueByFieldPath } from '@kbn/alerting-v2-utils';

const GROUP_NAME_SEPARATOR = ' · ';

export interface ResolveEpisodeNameParams {
  ruleName?: string;
  episodeData?: string | null;
  groupingFields?: readonly string[];
}

const resolveGroupName = (
  episodeData?: string | null,
  groupingFields?: readonly string[]
): string | undefined => {
  if (!groupingFields?.length || !episodeData) {
    return undefined;
  }

  const data = parseEpisodeDataJson(episodeData);
  const values = groupingFields
    .map((field) => getValueByFieldPath(data, field))
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
