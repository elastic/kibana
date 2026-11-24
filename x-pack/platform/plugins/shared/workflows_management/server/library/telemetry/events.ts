/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, RootSchema } from '@kbn/core/server';
import type { WorkflowTemplateOrigin } from '@kbn/workflows';

import type { LibraryErrorType } from '../classify_library_error';
import type { LibraryFetchErrorReason } from '../errors';
import type { LibraryFailureReason, LibraryOperation, LibrarySourceMode } from '../library_cache';

export const TEMPLATE_INSTALLED_EVENT_TYPE = 'workflows_template_installed';
export const LIBRARY_CATALOG_FAILED_EVENT_TYPE = 'workflows_library_catalog_failed';

export interface TemplateInstalledEvent {
  success: boolean;
  templateOrigin: WorkflowTemplateOrigin;
  sourceMode: LibrarySourceMode;
  templateSlug?: string;
  templateVersion?: string;
  solutions?: string[];
  formFieldCount?: number;
  connectorTypes?: string[];
  workflowId?: string;
  workflowValid?: boolean;
  errorType?: LibraryErrorType;
  fetchErrorReason?: LibraryFetchErrorReason;
  invalidFields?: string[];
}

export interface LibraryCatalogFailedEvent {
  operation: LibraryOperation;
  fetchErrorReason: LibraryFailureReason;
  sourceMode: LibrarySourceMode;
  templateSlug?: string;
}

const SOURCE_MODE_DESCRIPTION =
  'How the library reads its catalog: `http` (registry) or `bundle` (local files)';

const FETCH_ERROR_REASONS =
  'http-error, connection, timeout, malformed, integrity, too-large or unavailable';

const templateInstalledSchema: RootSchema<TemplateInstalledEvent> = {
  success: {
    type: 'boolean',
    _meta: { description: 'Whether the workflow was created from the template' },
  },
  templateOrigin: {
    type: 'keyword',
    _meta: {
      description:
        'How the workflow was created from the template: install (setup form), import (template file upload), or remix (Remix with AI)',
    },
  },
  sourceMode: {
    type: 'keyword',
    _meta: { description: SOURCE_MODE_DESCRIPTION },
  },
  templateSlug: {
    type: 'keyword',
    _meta: {
      description:
        'Workflow Template library slug, the same one stored on the workflow: `custom` for a template outside the catalog, `unresolved` when no catalog was available to check it. Absent until the template is read.',
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
    _meta: {
      description: 'Number of fields in the template install form (install and import only)',
      optional: true,
    },
  },
  connectorTypes: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Connector type of a connector field in the install form' },
    },
    _meta: {
      description:
        'Connector types of the install form connector fields, required or optional (install only)',
      optional: true,
    },
  },
  workflowId: {
    type: 'keyword',
    _meta: { description: 'ID of the created workflow, on success', optional: true },
  },
  workflowValid: {
    type: 'boolean',
    _meta: {
      description:
        'On success, whether the created workflow passed validation. An invalid workflow is still created, with `valid: false`, and cannot run until fixed.',
      optional: true,
    },
  },
  errorType: {
    type: 'keyword',
    _meta: {
      description:
        'Why it failed: form_validation, missing_form_field, template_parse, workflow_invalid, template_not_found, fetch_failed (the catalog or the template body failed to load), library_disabled or unknown',
      optional: true,
    },
  },
  fetchErrorReason: {
    type: 'keyword',
    _meta: {
      description: `Why the catalog or the template body failed to load, when errorType is fetch_failed: ${FETCH_ERROR_REASONS}`,
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
        'Install form field names (never values) that failed validation or are missing from the form (install only)',
      optional: true,
    },
  },
};

const libraryCatalogFailedSchema: RootSchema<LibraryCatalogFailedEvent> = {
  operation: {
    type: 'keyword',
    _meta: { description: 'What failed to load: `catalog` or `template` (a template body)' },
  },
  fetchErrorReason: {
    type: 'keyword',
    _meta: { description: `Why it failed: ${FETCH_ERROR_REASONS}, or unknown` },
  },
  sourceMode: {
    type: 'keyword',
    _meta: { description: SOURCE_MODE_DESCRIPTION },
  },
  templateSlug: {
    type: 'keyword',
    _meta: {
      description: 'Catalog slug of the template whose body failed to load (operation `template`)',
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
};
