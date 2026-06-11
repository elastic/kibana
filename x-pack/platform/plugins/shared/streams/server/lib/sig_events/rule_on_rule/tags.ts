/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TAG_MONITORED_PREFIX,
  TAG_RULE_ON_RULE,
  TAG_RULE_ON_RULE_PREFIX,
  TAG_STREAM_PREFIX,
  TAG_SYSTEM_MANAGED,
  UNKNOWN_STREAM_TAG,
} from './constants';

export function extractStreamNameFromTags(tags: string[]): string {
  const baseStreamTag = tags.find((tag) => tag.startsWith(TAG_STREAM_PREFIX));
  if (baseStreamTag) {
    return baseStreamTag.slice(TAG_STREAM_PREFIX.length);
  }

  const ruleOnRuleStreamTag = tags.find(
    (tag) => tag.startsWith(TAG_RULE_ON_RULE_PREFIX) && tag !== TAG_RULE_ON_RULE
  );
  if (ruleOnRuleStreamTag) {
    return ruleOnRuleStreamTag.slice(TAG_RULE_ON_RULE_PREFIX.length);
  }

  return UNKNOWN_STREAM_TAG;
}

export function extractMonitoredRuleIdFromTags(tags: string[]): string | undefined {
  const monitoredTag = tags.find((tag) => tag.startsWith(TAG_MONITORED_PREFIX));
  return monitoredTag ? monitoredTag.slice(TAG_MONITORED_PREFIX.length) : undefined;
}

export function isRuleOnRuleTagSet(tags: string[]): boolean {
  return tags.includes(TAG_RULE_ON_RULE);
}

export function buildRuleOnRuleTags({
  streamName,
  monitoredRuleId,
}: {
  streamName: string;
  monitoredRuleId: string;
}): string[] {
  return [
    TAG_RULE_ON_RULE,
    `${TAG_RULE_ON_RULE_PREFIX}${streamName}`,
    `${TAG_MONITORED_PREFIX}${monitoredRuleId}`,
    TAG_SYSTEM_MANAGED,
  ];
}
