/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { RESOLUTION_RULE_KINDS, RESOLUTION_RULE_IDS } from '../../../../../common';

export const EntityResolutionRuleTypeName = 'entity-resolution-rule';

export const EntityResolutionRuleAttributes = lazySchema(() =>
  z.object({
    id: z.nativeEnum(RESOLUTION_RULE_IDS),
    kind: z.nativeEnum(RESOLUTION_RULE_KINDS),
    managed: z.boolean(),
    enabled: z.boolean(),
  })
);
export type EntityResolutionRuleAttributes = z.infer<typeof EntityResolutionRuleAttributes>;
