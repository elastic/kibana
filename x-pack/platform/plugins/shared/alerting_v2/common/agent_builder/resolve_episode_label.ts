/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { parseEpisodeDataJson, getValueByFieldPath } from '@kbn/alerting-v2-utils';

const GROUP_NAME_SEPARATOR = ' · ';

export interface ResolveEpisodeLabelParams {
  episode: AlertEpisode;
  ruleName?: string;
  groupingFields?: readonly string[];
}

const resolveGroupName = (
  episode: AlertEpisode,
  groupingFields?: readonly string[]
): string | undefined => {
  if (!groupingFields?.length || !episode.episode_data) {
    return undefined;
  }

  const data = parseEpisodeDataJson(episode.episode_data);
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

export const resolveEpisodeLabel = ({
  episode,
  ruleName,
  groupingFields,
}: ResolveEpisodeLabelParams): string => {
  const resolvedRuleName = ruleName?.trim() || undefined;
  const groupName = resolveGroupName(episode, groupingFields);

  if (resolvedRuleName && groupName) {
    return i18n.translate('xpack.alertingV2.episodeAttachment.episodeLabelFromRuleAndGroup', {
      defaultMessage: '{ruleName} alert for {groupName}',
      values: { ruleName: resolvedRuleName, groupName },
    });
  }

  const label = resolvedRuleName ?? groupName;
  if (label) {
    return i18n.translate('xpack.alertingV2.episodeAttachment.episodeLabel', {
      defaultMessage: '{label} alert',
      values: { label: resolvedRuleName ?? groupName },
    });
  }

  return i18n.translate('xpack.alertingV2.episodeAttachment.episodeLabelFromRuleId', {
    defaultMessage: 'Alert for rule {ruleId}',
    values: { ruleId: episode['rule.id'] },
  });
};
