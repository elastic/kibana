/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandId } from '../command_menu/types';

export interface CommandBadgeData {
  readonly commandId: CommandId;
  readonly label: string;
  readonly id: string;
  // Metadata must not include `id` property
  readonly metadata: Record<string, string> & { id?: never };
  /** False for a badge committed with no resolved match (e.g. a typo'd connector name). Defaults to true. */
  readonly matched?: boolean;
  /** Only consume this many chars of the active query into the badge, leaving the rest as plain text. Defaults to the full query. */
  readonly consumedLength?: number;
}
