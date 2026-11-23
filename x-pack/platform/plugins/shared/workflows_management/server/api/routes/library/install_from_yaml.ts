/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { WORKFLOWS_LIBRARY_ENABLED_SETTING_ID } from '@kbn/workflows';
import { parseTemplateYaml, renderInstall } from '@kbn/workflows-library';

import { mapLibraryError } from './error_mapper';
import {
  LibraryDisabledError,
  type LibraryService,
  type LibraryTelemetry,
  resolveTemplateOrigin,
  type TemplateInstallDetails,
} from '../../../library';
import type { RouteDependencies } from '../types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { WORKFLOW_CREATE_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const bodySchema = schema.object({
  /**
   * The raw template YAML (with its `template-metadata` block) supplied by the
   * client — e.g. a file uploaded through the "Install template from file" flow.
   * Parsed and validated server-side; never fetched from the catalog.
   */
  yaml: schema.string({ maxLength: 512 * 1024 }),
  /**
   * Install-form values keyed by `install.form` field name. Value types are
   * validated against the template's declared form by `renderInstall`
   * (field-level 400 on mismatch), not by the transport schema.
   */
  values: schema.recordOf(schema.string({ maxLength: 1024 }), schema.any(), {
    defaultValue: {},
  }),
});

export function registerInstallFromYamlRoute(
  { router, api, spaces, audit, logger }: RouteDependencies,
  libraryService: LibraryService,
  telemetry: LibraryTelemetry
) {
  router.versioned
    .post({
      path: '/internal/workflows/library/templates/install',
      access: 'internal',
      security: WORKFLOW_CREATE_SECURITY,
      summary: 'Install a Workflow Template library template from raw YAML',
      description:
        'Parses a client-supplied template YAML, renders it with the submitted install-form values, and creates a workflow from the result.',
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: { request: { body: bodySchema } },
      },
      withAvailabilityCheck(async (context, request, response) => {
        // Filled in as the file is read, so a failure reports only what was known.
        const installDetails: TemplateInstallDetails = { source: 'file' };
        try {
          const { uiSettings } = await context.core;
          const enabled = await uiSettings.globalClient.get<boolean>(
            WORKFLOWS_LIBRARY_ENABLED_SETTING_ID
          );
          if (!enabled) throw new LibraryDisabledError();

          const template = parseTemplateYaml(request.body.yaml, { lenient: true });
          // The uploaded file declares its own slug: keep it only when it
          // names a catalog template, otherwise store it as `custom`. Resolved
          // before rendering, so a form error still reports the template.
          const templateOrigin = await resolveTemplateOrigin({
            libraryService,
            logger,
            slug: template.metadata.slug,
            version: template.metadata.version,
            origin: 'import',
          });
          installDetails.templateOrigin = templateOrigin;
          installDetails.installForm = template.metadata.install?.form ?? [];

          const { yaml } = renderInstall({ template, values: request.body.values });

          // The rendered YAML is indistinguishable from a hand-authored one:
          // reuse the same create path as POST /api/workflows/workflow so
          // schema validation, space scoping, and authz apply identically.
          const spaceId = spaces.getSpaceId(request);
          let createdWorkflow;
          try {
            createdWorkflow = await api.createWorkflow({ yaml }, spaceId, request, {
              templateOrigin,
            });
          } catch (error) {
            audit.logWorkflowCreateFailed(request, error);
            throw error;
          }
          audit.logWorkflowCreated(request, { id: createdWorkflow.id });
          telemetry.reportTemplateInstalled(libraryService, installDetails, createdWorkflow.id);

          return response.ok({ body: { workflowId: createdWorkflow.id } });
        } catch (error) {
          telemetry.reportTemplateInstallFailed(libraryService, installDetails, error);
          return mapLibraryError(response, error);
        }
      })
    );
}
