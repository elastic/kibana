/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { getErrorMessage } from '../../../lib/streams/errors/parse_error';
import { createServerRoute } from '../../create_server_route';
import { findConflictingTemplates } from '../../../lib/streams/helpers/validate_template_conflicts';

export const validateClassicStreamRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_validate_classic_stream',
  options: {
    access: 'internal',
    summary: 'Validate classic stream name',
    description:
      'Validates whether a classic stream name can be used by checking for duplicate streams, existing data streams, and higher priority index template conflicts',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      name: z.string(),
      selectedTemplateName: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients, logger }) => {
    const { streamsClient, scopedClusterClient } = await getScopedClients({ request });
    const { name, selectedTemplateName } = params.body;

    // Check 1: Does a stream with this name already exist?
    const streamExists = await streamsClient.existsStream(name);
    if (streamExists) {
      return {
        isValid: false,
        errorType: 'duplicate' as const,
      };
    }

    // Check 2: Would this stream name match a higher priority index template than the selected one?
    try {
      // Get the priority of the selected template
      const selectedTemplateDetails =
        await scopedClusterClient.asCurrentUser.indices.getIndexTemplate({
          name: selectedTemplateName,
        });
      const selectedTemplate = selectedTemplateDetails.index_templates[0]?.index_template;
      const selectedTemplatePriority = selectedTemplate?.priority ?? 0;

      // Get all index templates and find conflicts
      const allTemplatesResponse =
        await scopedClusterClient.asCurrentUser.indices.getIndexTemplate();

      const conflictingTemplates = findConflictingTemplates(
        name,
        selectedTemplateName,
        selectedTemplatePriority,
        allTemplatesResponse.index_templates
      );

      if (conflictingTemplates.length > 0) {
        const winningTemplate = conflictingTemplates[0]; // Highest priority

        return {
          isValid: false,
          errorType: 'higherPriority' as const,
          conflictingIndexPattern: winningTemplate.matchingPatterns[0],
        };
      }
    } catch (error) {
      logger.error(
        `Unexpected error checking for conflicting index templates: ${getErrorMessage(error)}`
      );
      throw error;
    }

    // All checks passed
    return {
      isValid: true,
      errorType: null,
    };
  },
});
