/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from 'yaml';
import { getRegisteredTriggerConditionDefinition } from './get_registered_trigger_condition_definition';
import { getPathAtOffset } from '../../../../../common/lib/yaml';

/**
 * True when the offset lies in `triggers[].on.condition` for a trigger registered in `triggerSchemas`
 * (same gate as {@link getTriggerConditionKqlSuggestions} / {@link getSuggestions}).
 */
export function isCursorInKqlTriggerConditionField(
  yamlDocument: Document | null | undefined,
  absoluteOffset: number
): boolean {
  if (!yamlDocument) {
    return false;
  }
  const path = getPathAtOffset(yamlDocument, absoluteOffset);
  return getRegisteredTriggerConditionDefinition(yamlDocument, path) != null;
}
