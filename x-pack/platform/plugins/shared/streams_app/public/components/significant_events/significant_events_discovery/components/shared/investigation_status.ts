/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';

/** Returns true when the event has at least one investigation currently in flight. */
export const hasRunningInvestigation = (event: SignificantEvent): boolean =>
  event.investigations?.some((i) => i.completed_at == null) ?? false;
