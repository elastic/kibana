/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { apiPrivileges } from '@kbn/agent-builder-plugin/common/features';
import { pdfAvailabilityPath } from '@kbn/agent-builder-plugin/common/constants';
import { isPdfExtractionAvailable } from '../attachment_types/pdf/extraction_availability';

export const registerPdfAvailabilityRoute = ({ router }: { router: IRouter }) => {
  router.get(
    {
      path: pdfAvailabilityPath,
      validate: false,
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    async (_context, _request, response) =>
      response.ok({ body: { available: isPdfExtractionAvailable() } })
  );
};
