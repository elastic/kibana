/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { TemplateOriginFields, WorkflowTemplateOrigin } from '@kbn/workflows';
import type { InstallFormField, Template } from '@kbn/workflows-library';

import type { LibraryCatalogFailedEvent, TemplateInstalledEvent } from './events';
import { LIBRARY_CATALOG_FAILED_EVENT_TYPE, TEMPLATE_INSTALLED_EVENT_TYPE } from './events';
import { classifyLibraryError } from '../classify_library_error';
import type { LibraryFailure, LibraryHealth } from '../library_cache';

/** What the telemetry reads from the library it reports on. */
export interface LibraryTelemetryReader {
  getHealth(): LibraryHealth;
  getCachedTemplates(): Template[] | undefined;
}

export interface LibraryTelemetryDeps {
  analytics: Pick<AnalyticsServiceSetup, 'reportEvent'>;
  logger: Logger;
  library: LibraryTelemetryReader;
}

/**
 * What a route knows about the template it creates a workflow from. The route
 * fills in the template fields as it reads them, so a failure reports only what
 * was known when it happened.
 */
export interface TemplateInstallDetails {
  /** How the workflow is created from the template, known before the template is read. */
  origin: WorkflowTemplateOrigin;
  /** The template origin stored on the workflow: the same slug and version reach the event. */
  storedOrigin?: TemplateOriginFields;
  /** The template's install form. Remix has none. */
  installForm?: InstallFormField[];
}

/** The workflow a route created. Creation accepts invalid YAML and stores it with `valid: false`. */
export interface CreatedWorkflow {
  id: string;
  valid: boolean;
}

type TemplateInstallFailureFields = Pick<
  TemplateInstalledEvent,
  'errorType' | 'fetchErrorReason' | 'invalidFields'
>;

const findCatalogTemplate = (
  templates: Template[] | undefined,
  slug: string | undefined
): Template | undefined =>
  slug === undefined ? undefined : templates?.find((template) => template.slug === slug);

/** Connector types of every connector field in the form, required or optional. */
const getConnectorTypes = (form: InstallFormField[]): string[] => [
  ...new Set(
    form.flatMap((field) => (field.inputType === 'connector' ? [field.connectorType] : []))
  ),
];

/** `describeForm` is false when the form's field names are free text (an uploaded file). */
const getFailureFields = (error: unknown, describeForm: boolean): TemplateInstallFailureFields => {
  const classified = classifyLibraryError(error);
  switch (classified.type) {
    case 'fetch_failed':
      return { errorType: classified.type, fetchErrorReason: classified.error.reason };
    case 'form_validation':
      return {
        errorType: classified.type,
        ...(describeForm
          ? { invalidFields: [...new Set(classified.error.errors.map(({ field }) => field))] }
          : {}),
      };
    case 'missing_form_field':
      return {
        errorType: classified.type,
        ...(describeForm ? { invalidFields: classified.error.fields } : {}),
      };
    default:
      return { errorType: classified.type };
  }
};

const buildTemplateInstalledEvent = (
  library: LibraryTelemetryReader,
  { origin, storedOrigin, installForm }: TemplateInstallDetails,
  outcome: { workflow: CreatedWorkflow } | { error: unknown }
): TemplateInstalledEvent => {
  // Only a catalog template's form is described: the field names and connector
  // types in an uploaded file are free text.
  const describeForm = origin === 'install';
  const { templateSlug, templateVersion }: TemplateOriginFields = storedOrigin ?? {};
  const catalogTemplate = findCatalogTemplate(library.getCachedTemplates(), templateSlug);

  return {
    success: 'workflow' in outcome,
    templateOrigin: origin,
    sourceMode: library.getHealth().sourceMode,
    ...(templateSlug ? { templateSlug } : {}),
    ...(templateVersion ? { templateVersion } : {}),
    ...(catalogTemplate ? { solutions: catalogTemplate.solutions ?? [] } : {}),
    ...(installForm ? { formFieldCount: installForm.length } : {}),
    ...(describeForm && installForm ? { connectorTypes: getConnectorTypes(installForm) } : {}),
    ...('workflow' in outcome
      ? { workflowId: outcome.workflow.id, workflowValid: outcome.workflow.valid }
      : getFailureFields(outcome.error, describeForm)),
  };
};

/**
 * Reports the Workflow Template library server events. Never throws: telemetry
 * must not change the outcome of the request that sends it.
 */
export class LibraryTelemetry {
  constructor(private readonly deps: LibraryTelemetryDeps) {}

  reportTemplateInstalled(details: TemplateInstallDetails, workflow: CreatedWorkflow): void {
    this.report(TEMPLATE_INSTALLED_EVENT_TYPE, () =>
      buildTemplateInstalledEvent(this.deps.library, details, { workflow })
    );
  }

  reportTemplateInstallFailed(details: TemplateInstallDetails, error: unknown): void {
    this.report(TEMPLATE_INSTALLED_EVENT_TYPE, () =>
      buildTemplateInstalledEvent(this.deps.library, details, { error })
    );
  }

  /**
   * Listener for {@link LibraryCache} status changes. The event is built field
   * by field, so nothing else added to the failure later can reach telemetry.
   */
  readonly reportCatalogFailed = (failure: LibraryFailure): void => {
    this.report(
      LIBRARY_CATALOG_FAILED_EVENT_TYPE,
      (): LibraryCatalogFailedEvent => ({
        operation: failure.operation,
        fetchErrorReason: failure.reason,
        sourceMode: this.deps.library.getHealth().sourceMode,
        ...(failure.operation === 'template' ? { templateSlug: failure.templateSlug } : {}),
      })
    );
  };

  private report<T extends object>(eventType: string, buildEvent: () => T): void {
    try {
      this.deps.analytics.reportEvent(eventType, buildEvent());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.deps.logger.warn(`Failed to report the ${eventType} event: ${message}`);
    }
  }
}
