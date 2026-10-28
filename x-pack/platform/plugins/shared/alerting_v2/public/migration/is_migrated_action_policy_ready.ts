/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MigratedActionPolicy } from './types';

/** Policies whose workflow step has everything it needs; the rest need user input first. */
export const isMigratedActionPolicyReady = ({
  connectorId,
  notes,
}: MigratedActionPolicy): boolean => connectorId !== null && !notes.includes('connector_required');
