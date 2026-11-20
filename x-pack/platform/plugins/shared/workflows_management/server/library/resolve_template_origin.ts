/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { withTimeout } from '@kbn/std';
import {
  CUSTOM_WORKFLOW_TEMPLATE_SLUG,
  type TemplateOriginFields,
  type WorkflowTemplateOrigin,
} from '@kbn/workflows';
import type { Template } from '@kbn/workflows-library';
import type { LibraryService } from './library_service';

/** How long a save waits for the catalog before it stores the template origin as custom. */
export const CATALOG_LOOKUP_TIMEOUT_MS = 3_000;

export interface ResolveTemplateOriginParams {
  libraryService: Pick<LibraryService, 'listTemplates'>;
  logger: Logger;
  slug: string;
  version: string | undefined;
  origin: WorkflowTemplateOrigin;
}

// A stalled registry must not hold up the save: past the deadline, the refresh keeps
// running in the background and fills the cache for the next lookup.
const listCatalogTemplates = async (
  libraryService: ResolveTemplateOriginParams['libraryService'],
  logger: Logger
): Promise<Template[] | undefined> => {
  try {
    const result = await withTimeout({
      promise: libraryService.listTemplates(),
      timeoutMs: CATALOG_LOOKUP_TIMEOUT_MS,
    });
    if (!result.timedout) {
      return result.value;
    }
    logger.debug(
      `Template catalog lookup timed out after ${CATALOG_LOOKUP_TIMEOUT_MS}ms, storing the template origin as custom`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.debug(`Template catalog unavailable, storing the template origin as custom: ${message}`);
  }
  return undefined;
};

/**
 * Template origin to store on a workflow created from a template that may not be in the
 * catalog: the slug and version for a catalog template, otherwise `custom`, so values that
 * users choose never reach telemetry.
 */
export const resolveTemplateOrigin = async ({
  libraryService,
  logger,
  slug,
  version,
  origin,
}: ResolveTemplateOriginParams): Promise<TemplateOriginFields> => {
  const templates = await listCatalogTemplates(libraryService, logger);
  const catalogTemplate = templates?.find((template) => template.slug === slug);

  if (!catalogTemplate) {
    return { templateSlug: CUSTOM_WORKFLOW_TEMPLATE_SLUG, templateOrigin: origin };
  }

  return {
    templateSlug: slug,
    // The caller supplies the version, so it is kept only when the catalog confirms it.
    ...(version === catalogTemplate.version ? { templateVersion: version } : {}),
    templateOrigin: origin,
  };
};
