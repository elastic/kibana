/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import type { Logger } from '@kbn/core/server';
import {
  CUSTOM_WORKFLOW_TEMPLATE_SLUG,
  type TemplateOriginFields,
  type WorkflowTemplateOrigin,
} from '@kbn/workflows';
import type { LibraryService } from './library_service';

export interface ResolveTemplateOriginParams {
  libraryService: Pick<LibraryService, 'listTemplates'>;
  logger: Logger;
  slug: string;
  version: string | undefined;
  origin: WorkflowTemplateOrigin;
}

/**
 * Template origin to store on a workflow created from a template that may not be in the
 * catalog: the slug and version for a catalog template, otherwise `custom`, so slugs that
 * users choose never reach telemetry.
 */
export const resolveTemplateOrigin = async ({
  libraryService,
  logger,
  slug,
  version,
  origin,
}: ResolveTemplateOriginParams): Promise<TemplateOriginFields> => {
  const customOrigin: TemplateOriginFields = {
    templateSlug: CUSTOM_WORKFLOW_TEMPLATE_SLUG,
    templateOrigin: origin,
  };

  let isCatalogTemplate: boolean;
  try {
    const templates = await libraryService.listTemplates();
    isCatalogTemplate = templates.some((template) => template.slug === slug);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.debug(`Template catalog unavailable, storing the template origin as custom: ${message}`);
    return customOrigin;
  }

  if (!isCatalogTemplate) {
    return customOrigin;
  }

  return {
    templateSlug: slug,
    ...(version && semver.valid(version) ? { templateVersion: version } : {}),
    templateOrigin: origin,
  };
};
