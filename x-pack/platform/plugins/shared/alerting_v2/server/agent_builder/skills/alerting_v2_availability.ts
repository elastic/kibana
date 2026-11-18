/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AvailabilityConfig } from '@kbn/agent-builder-server/availability';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { Space } from '@kbn/spaces-plugin/common';

interface AlertingV2AvailabilityDeps {
  getActiveSpace: (request: KibanaRequest) => Promise<Pick<Space, 'solution'>>;
  projectType?: CloudSetup['serverless']['projectType'];
}

const isObservabilityProject = (projectType: AlertingV2AvailabilityDeps['projectType']): boolean =>
  !projectType || projectType === 'observability';

const isObservabilitySolution = (solution?: Space['solution']): boolean =>
  !solution || solution === 'classic' || solution === 'oblt';

/** Shared availability gate for universal alerting Agent Builder skills. */
export const createAlertingV2Availability = ({
  getActiveSpace,
  projectType,
}: AlertingV2AvailabilityDeps): AvailabilityConfig => ({
  cacheMode: 'none',
  handler: async ({ request }) => {
    if (!isObservabilityProject(projectType)) {
      return {
        status: 'unavailable',
        reason: 'Universal alerting skills are only available in Observability projects',
      };
    }

    try {
      const { solution } = await getActiveSpace(request);
      return isObservabilitySolution(solution)
        ? { status: 'available' }
        : {
            status: 'unavailable',
            reason:
              'Universal alerting skills are only available in Observability or Classic spaces',
          };
    } catch {
      return { status: 'available' };
    }
  },
});
