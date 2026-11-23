/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, RootSchema } from '@kbn/core/server';

import type { LibraryErrorType } from '../classify_library_error';
import type { LibraryFailure, LibrarySourceMode } from '../library_cache';

export const TEMPLATE_INSTALLED_EVENT_TYPE = 'workflows_template_installed';
export const LIBRARY_CATALOG_FAILED_EVENT_TYPE = 'workflows_library_catalog_failed';
export const TEMPLATE_LOAD_FAILED_EVENT_TYPE = 'workflows_template_load_failed';

/** Where the installed template came from: the catalog (Install) or an uploaded file (Import template). */
export type TemplateInstallSource = 'catalog' | 'file';

export interface TemplateInstalledEvent {
  success: boolean;
  source: TemplateInstallSource;
  sourceMode: LibrarySourceMode;
  templateSlug?: string;
  templateVersion?: string;
  solutions?: string[];
  formFieldCount?: number;
  requiredConnectorTypes?: string[];
  workflowId?: string;
  errorType?: LibraryErrorType;
  invalidFields?: string[];
}

export type LibraryCatalogFailedEvent = LibraryFailure;

export interface TemplateLoadFailedEvent {
  reason: 'not_found' | 'fetch_error';
  templateSlug?: string;
}

const templateInstalledSchema: RootSchema<TemplateInstalledEvent> = {
  success: {
    type: 'boolean',
    _meta: { description: 'Whether the workflow was created from the template' },
  },
  source: {
    type: 'keyword',
    _meta: {
      description: 'Where the template came from: `catalog` (Install) or `file` (Import template)',
    },
  },
  sourceMode: {
    type: 'keyword',
    _meta: {
      description: 'How the library reads its catalog: `http` (registry) or `bundle` (local files)',
    },
  },
  templateSlug: {
    type: 'keyword',
    _meta: {
      description:
        'Catalog slug of the template; `custom` when it is not in the catalog, `unresolved` when no catalog was available to check it. Absent until the template is read.',
      optional: true,
    },
  },
  templateVersion: {
    type: 'keyword',
    _meta: {
      description: 'Template version, sent only when it matches the catalog version',
      optional: true,
    },
  },
  solutions: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Solution the catalog lists the template under' },
    },
    _meta: {
      description:
        'Solutions the catalog lists the template under; empty for a cross-solution template',
      optional: true,
    },
  },
  formFieldCount: {
    type: 'integer',
    _meta: { description: 'Number of fields in the template install form', optional: true },
  },
  requiredConnectorTypes: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Connector type a catalog template install form asks for' },
    },
    _meta: {
      description: 'Connector types the install form asks for (catalog templates only)',
      optional: true,
    },
  },
  workflowId: {
    type: 'keyword',
    _meta: { description: 'ID of the created workflow, on success', optional: true },
  },
  errorType: {
    type: 'keyword',
    _meta: {
      description:
        'Why the install failed: form_validation, missing_form_field, template_parse, workflow_invalid, template_not_found, catalog_unavailable, library_disabled or unknown',
      optional: true,
    },
  },
  invalidFields: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Name of an install form field that failed validation' },
    },
    _meta: {
      description:
        'Install form field names (never values) that failed validation or are missing from the form (catalog templates only)',
      optional: true,
    },
  },
};

const libraryCatalogFailedSchema: RootSchema<LibraryCatalogFailedEvent> = {
  operation: {
    type: 'keyword',
    _meta: { description: 'What failed to load: `catalog` or `template` (a template body)' },
  },
  reason: {
    type: 'keyword',
    _meta: {
      description:
        'Why it failed: http-error, connection, timeout, malformed, integrity, too-large, unavailable or unknown',
    },
  },
  sourceMode: {
    type: 'keyword',
    _meta: {
      description: 'How the library reads its catalog: `http` (registry) or `bundle` (local files)',
    },
  },
};

const templateLoadFailedSchema: RootSchema<TemplateLoadFailedEvent> = {
  reason: {
    type: 'keyword',
    _meta: {
      description:
        'Why the template could not be shown: `not_found` (no such slug) or `fetch_error` (the catalog or template body failed to load)',
    },
  },
  templateSlug: {
    type: 'keyword',
    _meta: {
      description: 'Catalog slug of the template, sent only when it is in the catalog',
      optional: true,
    },
  },
};

/** Registers the Workflow Template library server events; call once during plugin setup. */
export const registerLibraryEventTypes = (
  analytics: Pick<AnalyticsServiceSetup, 'registerEventType'>
): void => {
  analytics.registerEventType<TemplateInstalledEvent>({
    eventType: TEMPLATE_INSTALLED_EVENT_TYPE,
    schema: templateInstalledSchema,
  });
  analytics.registerEventType<LibraryCatalogFailedEvent>({
    eventType: LIBRARY_CATALOG_FAILED_EVENT_TYPE,
    schema: libraryCatalogFailedSchema,
  });
  analytics.registerEventType<TemplateLoadFailedEvent>({
    eventType: TEMPLATE_LOAD_FAILED_EVENT_TYPE,
    schema: templateLoadFailedSchema,
  });
};
