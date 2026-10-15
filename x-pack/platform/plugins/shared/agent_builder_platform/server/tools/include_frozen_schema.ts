/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Opt-in flag shared by the built-in tools that read index data, letting the agent include
 * frozen tier indices, which are excluded by default.
 */
export const includeFrozenSchema = z
  .boolean()
  .optional()
  .describe(
    '(Optional) Include indices on the frozen tier. Defaults to false, since querying the frozen tier recovers searchable snapshots from object storage, which is slow and can time out. Only set to true when the user or the agent instructions explicitly ask for frozen tier data.'
  );
