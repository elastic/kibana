/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasPriorityExtractionGate } from '../../../../common/domain/definitions/registry';
import type { EngineDescriptor, EngineStatus } from '../../../domain/saved_objects';

/** The two status fields a type can carry. Enough to decide whether it needs acting on. */
export type EngineProcessStatuses = Pick<EngineDescriptor, 'type' | 'status' | 'nonPriorityStatus'>;

/**
 * Whether a type qualifies when any process it runs does.
 *
 * `nonPriorityStatus` counts only when the type has a priority gate and the deployment has
 * dual-process extraction on. Both conditions matter: ungated types never have the field written,
 * and with the flag off `start()` writes `nonPriorityStatus: STOPPED` on a gated type that is
 * perfectly healthy, so reading it would make a running engine look like it needs starting.
 *
 * Both the public routes and the internal `both` branch use this: they start and stop every
 * process a type runs, which is one task for `host` and the priority/non-priority pair for `user`.
 */
export const pairedQualifies = (
  engine: EngineProcessStatuses,
  qualifies: (status: EngineStatus | null | undefined) => boolean,
  dualProcessEnabled: boolean
): boolean =>
  qualifies(engine.status) ||
  (dualProcessEnabled &&
    hasPriorityExtractionGate(engine.type) &&
    qualifies(engine.nonPriorityStatus));
