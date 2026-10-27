/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryDreamingUser } from '../../../common/http_api/memory';

export interface MemoryDreamingTaskParams {
  spaceId: string;
  enabledBy: MemoryDreamingUser;
  enabledAt: string;
  /** When false, the task only runs from "Dream now". */
  scheduled?: boolean;
  /** Every dream that isn't catching up deletes the space's long-term memories and reads everything. */
  rebuild?: boolean;
}
