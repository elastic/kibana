/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  consolidateShortTermMemoriesStepCommonDefinition,
  decayShortTermMemoriesStepCommonDefinition,
  listShortTermMemoriesByOwnerStepCommonDefinition,
  listShortTermMemoriesStepCommonDefinition,
  setShortTermMemoryPromotionStepCommonDefinition,
} from '../../common/workflows/steps/short_term_memory';
import { sharedIcon } from './conversations';

export const listShortTermMemoriesStepDefinition = createPublicStepDefinition({
  icon: sharedIcon,
  ...listShortTermMemoriesStepCommonDefinition,
});

export const setShortTermMemoryPromotionStepDefinition = createPublicStepDefinition({
  icon: sharedIcon,
  ...setShortTermMemoryPromotionStepCommonDefinition,
});

export const listShortTermMemoriesByOwnerStepDefinition = createPublicStepDefinition({
  icon: sharedIcon,
  ...listShortTermMemoriesByOwnerStepCommonDefinition,
});

export const consolidateShortTermMemoriesStepDefinition = createPublicStepDefinition({
  icon: sharedIcon,
  ...consolidateShortTermMemoriesStepCommonDefinition,
});

export const decayShortTermMemoriesStepDefinition = createPublicStepDefinition({
  icon: sharedIcon,
  ...decayShortTermMemoriesStepCommonDefinition,
});
