/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from 'yaml';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import { getTriggerConditionBlockIndex, getTriggerTypeAtIndex } from './context/triggers_utils';
import { triggerSchemas } from '../../../../trigger_schemas';

/**
 * When `path` is `triggers[i].on.condition` and `triggers[i].type` resolves to a trigger registered
 * in workflows extensions, returns its public definition; otherwise `undefined`.
 */
export function getRegisteredTriggerConditionDefinition(
  yamlDocument: Document,
  path: (string | number)[]
): PublicTriggerDefinition | undefined {
  const blockIndex = getTriggerConditionBlockIndex(path);
  if (blockIndex === null) {
    return undefined;
  }
  const triggerType = getTriggerTypeAtIndex(yamlDocument, blockIndex);
  if (triggerType === null) {
    return undefined;
  }
  return triggerSchemas.getTriggerDefinition(triggerType);
}
