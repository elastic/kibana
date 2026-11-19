/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '../../common';

export type { TriggerDocumentation, TriggerSnippets } from '../../common/trigger_registry/types';

/**
 * User-facing definition for a workflow trigger.
 * Spreads the shared common contract and adds UI-only presentation (icon).
 *
 * @example
 * {
 *   ...commonMyTriggerDefinition,
 *   icon: React.lazy(() => import('...')),
 * }
 */
export interface PublicTriggerDefinition<EventSchema extends z.ZodType = z.ZodType>
  extends CommonTriggerDefinition<EventSchema> {
  /**
   * Used to visually represent this trigger in the UI.
   */
  icon?: React.ComponentType;
}
