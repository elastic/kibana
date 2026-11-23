/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory } from '@kbn/core/server';

import { classifyLibraryError } from '../../../library';
import { handleRouteError } from '../utils/route_error_handlers';

/**
 * Maps library-layer errors to HTTP responses. Kept separate from the
 * existing `handleRouteError` in `api/routes/utils/route_error_handlers.ts`
 * because library errors are a distinct family (no overlap in classes) and
 * the mapping decisions are local (e.g. `LibraryFetchError(reason='unavailable')`
 * → 503 with a tech-preview-friendly message). Errors outside the family
 * fall through to `handleRouteError` (the install route funnels rendered YAML
 * into the shared create-workflow path, whose errors keep their usual mapping).
 */
export function mapLibraryError(response: KibanaResponseFactory, error: unknown) {
  const classified = classifyLibraryError(error);
  switch (classified.type) {
    case 'library_disabled':
      return response.customError({
        statusCode: classified.error.statusCode,
        body: { message: classified.error.message },
      });

    case 'form_validation':
      // Field-level details travel under `attributes` (the standard error body
      // strips other top-level fields) so the install UI can highlight rows.
      return response.badRequest({
        body: {
          message: classified.error.message,
          attributes: { errors: classified.error.errors },
        },
      });

    case 'missing_form_field':
      return response.badRequest({
        body: {
          message: classified.error.message,
          attributes: {
            errors: classified.error.fields.map((field) => ({
              field,
              reason: 'Referenced by the template body but not declared in `install.form`.',
            })),
          },
        },
      });

    case 'template_parse':
      // A client-supplied template YAML (e.g. an uploaded file) failed to parse
      // or its metadata is malformed — a 400, not a catalog 404/503.
      return response.badRequest({ body: { message: classified.error.message } });

    case 'template_not_found':
      return response.notFound({ body: { message: classified.error.message } });

    case 'catalog_unavailable':
      // 'unavailable' and 'connection' both mean "upstream not reachable / not
      // ready"; surface as 503 so callers can retry.
      // 'http-error' and 'malformed' mean the upstream gave us something
      // unusable — surface as 503 as well for tech preview (single retry-able
      // status). Promote to 502 later if/when consumers care to distinguish.
      return response.customError({
        statusCode: 503,
        body: { message: classified.error.message },
      });

    case 'workflow_invalid':
      return handleRouteError(response, classified.error);

    case 'unknown':
      if (classified.error instanceof Error) {
        return handleRouteError(response, classified.error);
      }
      return response.customError({
        statusCode: 500,
        body: {
          message: `Internal server error: ${String(classified.error)}`,
        },
      });
  }
}
