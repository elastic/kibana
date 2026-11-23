/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { TemplateOriginFields } from '@kbn/workflows';
import type { InstallFormField, Template } from '@kbn/workflows-library';

import type {
  LibraryCatalogFailedEvent,
  TemplateInstalledEvent,
  TemplateInstallSource,
  TemplateLoadFailedEvent,
} from './events';
import {
  LIBRARY_CATALOG_FAILED_EVENT_TYPE,
  TEMPLATE_INSTALLED_EVENT_TYPE,
  TEMPLATE_LOAD_FAILED_EVENT_TYPE,
} from './events';
import { classifyLibraryError } from '../classify_library_error';
import type { LibraryFailure } from '../library_cache';
import type { LibraryService } from '../library_service';

type LibraryReader = Pick<LibraryService, 'getHealth' | 'getCachedTemplates'>;

/**
 * What an install route knows about the template it installs. The route fills
 * in the template fields as it reads them, so a failure reports only what was
 * known when it happened.
 */
export interface TemplateInstallDetails {
  source: TemplateInstallSource;
  /** The template origin stored on the workflow: the same slug and version reach the event. */
  templateOrigin?: TemplateOriginFields;
  installForm?: InstallFormField[];
}

const findCatalogTemplate = (
  templates: Template[] | undefined,
  slug: string | undefined
): Template | undefined =>
  slug === undefined ? undefined : templates?.find((template) => template.slug === slug);

const getRequiredConnectorTypes = (form: InstallFormField[]): string[] => [
  ...new Set(
    form.flatMap((field) => (field.inputType === 'connector' ? [field.connectorType] : []))
  ),
];

const getInvalidFields = (error: unknown): string[] | undefined => {
  const classified = classifyLibraryError(error);
  switch (classified.type) {
    case 'form_validation':
      return [...new Set(classified.error.errors.map(({ field }) => field))];
    case 'missing_form_field':
      return classified.error.fields;
    default:
      return undefined;
  }
};

const buildTemplateInstalledEvent = (
  library: LibraryReader,
  { source, templateOrigin, installForm }: TemplateInstallDetails,
  outcome: { workflowId: string } | { error: unknown }
): TemplateInstalledEvent => {
  // Form field names and connector types in an uploaded file are free text, so
  // only a catalog template sends them.
  const fromCatalog = source === 'catalog';
  const catalogTemplate = findCatalogTemplate(
    library.getCachedTemplates(),
    templateOrigin?.templateSlug
  );
  const invalidFields = 'error' in outcome ? getInvalidFields(outcome.error) : undefined;

  return {
    success: 'workflowId' in outcome,
    source,
    sourceMode: library.getHealth().sourceMode,
    ...(templateOrigin?.templateSlug ? { templateSlug: templateOrigin.templateSlug } : {}),
    ...(templateOrigin?.templateVersion ? { templateVersion: templateOrigin.templateVersion } : {}),
    ...(catalogTemplate ? { solutions: catalogTemplate.solutions ?? [] } : {}),
    ...(installForm ? { formFieldCount: installForm.length } : {}),
    ...(fromCatalog && installForm
      ? { requiredConnectorTypes: getRequiredConnectorTypes(installForm) }
      : {}),
    ...('workflowId' in outcome
      ? { workflowId: outcome.workflowId }
      : { errorType: classifyLibraryError(outcome.error).type }),
    ...(fromCatalog && invalidFields ? { invalidFields } : {}),
  };
};

/**
 * Reports the Workflow Template library server events. Never throws: telemetry
 * must not change the outcome of the request that sends it.
 */
export class LibraryTelemetry {
  constructor(
    private readonly analytics: Pick<AnalyticsServiceSetup, 'reportEvent'>,
    private readonly logger: Logger
  ) {}

  reportTemplateInstalled(
    library: LibraryReader,
    details: TemplateInstallDetails,
    workflowId: string
  ): void {
    this.report(TEMPLATE_INSTALLED_EVENT_TYPE, () =>
      buildTemplateInstalledEvent(library, details, { workflowId })
    );
  }

  reportTemplateInstallFailed(
    library: LibraryReader,
    details: TemplateInstallDetails,
    error: unknown
  ): void {
    this.report(TEMPLATE_INSTALLED_EVENT_TYPE, () =>
      buildTemplateInstalledEvent(library, details, { error })
    );
  }

  /**
   * The slug comes from the URL, so it is sent only when it names a catalog
   * template. Errors that are not about loading the template send nothing.
   */
  reportTemplateLoadFailed(library: LibraryReader, slug: string, error: unknown): void {
    const { type } = classifyLibraryError(error);
    if (type !== 'template_not_found' && type !== 'catalog_unavailable') return;

    this.report(TEMPLATE_LOAD_FAILED_EVENT_TYPE, (): TemplateLoadFailedEvent => {
      const inCatalog = findCatalogTemplate(library.getCachedTemplates(), slug) !== undefined;
      return {
        reason: type === 'template_not_found' ? 'not_found' : 'fetch_error',
        ...(inCatalog ? { templateSlug: slug } : {}),
      };
    });
  }

  /** Listener for {@link LibraryCache} status changes. */
  readonly reportCatalogFailed = (failure: LibraryFailure): void => {
    this.report(LIBRARY_CATALOG_FAILED_EVENT_TYPE, (): LibraryCatalogFailedEvent => failure);
  };

  private report<T extends object>(eventType: string, buildEvent: () => T): void {
    try {
      this.analytics.reportEvent(eventType, buildEvent());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to report the ${eventType} event: ${message}`);
    }
  }
}
