/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import type { SolutionView } from '@kbn/spaces-plugin/common';

/**
 * Sets the solution for a space via the internal Spaces API.
 * Use this in beforeAll to configure the test space with a specific solution view.
 *
 * @param kbnClient - The Kibana client instance
 * @param spaceId - The ID of the space to update
 * @param solution - The solution to set ('security', 'oblt', 'es', or 'classic')
 *
 * @example
 * ```typescript
 * spaceTest.beforeAll(async ({ scoutSpace, kbnClient }) => {
 *   await setSpaceSolution(kbnClient, scoutSpace.id, 'security');
 * });
 * ```
 */
export async function setSpaceSolution(
  kbnClient: KbnClient,
  spaceId: string,
  solution: SolutionView
): Promise<void> {
  await kbnClient.request({
    method: 'PUT',
    path: `/internal/spaces/space/${spaceId}/solution`,
    body: { solution },
  });
}
