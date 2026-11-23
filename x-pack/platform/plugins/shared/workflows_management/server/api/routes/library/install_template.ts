/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { type TemplateOriginFields, WORKFLOWS_LIBRARY_ENABLED_SETTING_ID } from '@kbn/workflows';
import { renderInstall } from '@kbn/workflows-library';

import { mapLibraryError } from './error_mapper';
import {
  LibraryDisabledError,
  type LibraryService,
  type LibraryTelemetry,
  type TemplateInstallDetails,
} from '../../../library';
import type { RouteDependencies } from '../types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { WORKFLOW_CREATE_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const paramsSchema = schema.object({
  slug: schema.string({ maxLength: 256 }),
});

const bodySchema = schema.object({
  /**
   * Install-form values keyed by `install.form` field name. Value types are
   * validated against the template's declared form by `renderInstall`
   * (field-level 400 on mismatch), not by the transport schema.
   */
  values: schema.recordOf(schema.string({ maxLength: 1024 }), schema.any(), {
    defaultValue: {},
  }),
});

export function registerInstallTemplateRoute(
  { router, api, spaces, audit }: RouteDependencies,
  libraryService: LibraryService,
  telemetry: LibraryTelemetry
) {
  router.versioned
    .post({
      path: '/internal/workflows/library/templates/{slug}/install',
      access: 'internal',
      security: WORKFLOW_CREATE_SECURITY,
      summary: 'Install a Workflow Template library template',
      description:
        'Renders a template with the submitted install-form values and creates a workflow from the result.',
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: { request: { params: paramsSchema, body: bodySchema } },
      },
      withAvailabilityCheck(async (context, request, response) => {
        // Filled in once the template is read from the catalog, so a failure
        // before that never reports the slug from the URL.
        const installDetails: TemplateInstallDetails = { source: 'catalog' };
        try {
          const { uiSettings } = await context.core;
          const enabled = await uiSettings.globalClient.get<boolean>(
            WORKFLOWS_LIBRARY_ENABLED_SETTING_ID
          );
          if (!enabled) throw new LibraryDisabledError();

          const template = await libraryService.getTemplate(request.params.slug);
          const { slug, version, install } = template.metadata;
          const templateOrigin: TemplateOriginFields = {
            templateSlug: slug,
            templateVersion: version,
            templateOrigin: 'install',
          };
          installDetails.templateOrigin = templateOrigin;
          installDetails.installForm = install?.form ?? [];

          const { yaml } = renderInstall({ template, values: request.body.values });

          // The rendered YAML is indistinguishable from a hand-authored one:
          // reuse the same create path as POST /api/workflows/workflow so
          // schema validation, space scoping, and authz apply identically.
          // The template origin is stored next to it, since the YAML no
          // longer carries the template metadata.
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
