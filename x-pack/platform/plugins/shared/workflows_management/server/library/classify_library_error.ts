/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  InstallFormValidationError,
  MissingInstallFormFieldError,
  TemplateParseError,
} from '@kbn/workflows-library';
import {
  InvalidYamlSchemaError,
  InvalidYamlSyntaxError,
  isWorkflowValidationError,
} from '@kbn/workflows-yaml';

import { LibraryDisabledError, LibraryFetchError, LibraryNotFoundError } from './errors';

export type ClassifiedLibraryError =
  | { type: 'library_disabled'; error: LibraryDisabledError }
  | { type: 'form_validation'; error: InstallFormValidationError }
  | { type: 'missing_form_field'; error: MissingInstallFormFieldError }
  | { type: 'template_parse'; error: TemplateParseError }
  | { type: 'template_not_found'; error: LibraryNotFoundError }
  | { type: 'catalog_unavailable'; error: LibraryFetchError }
  | { type: 'workflow_invalid'; error: Error }
  | { type: 'unknown'; error: unknown };

export type LibraryErrorType = ClassifiedLibraryError['type'];

/**
 * Sorts an error from a library route into one class, so the HTTP response and
 * the telemetry `errorType` come from the same decision.
 */
export const classifyLibraryError = (error: unknown): ClassifiedLibraryError => {
  if (error instanceof LibraryDisabledError) return { type: 'library_disabled', error };
  if (error instanceof InstallFormValidationError) return { type: 'form_validation', error };
  if (error instanceof MissingInstallFormFieldError) return { type: 'missing_form_field', error };
  if (error instanceof TemplateParseError) return { type: 'template_parse', error };
  if (error instanceof LibraryNotFoundError) return { type: 'template_not_found', error };
  if (error instanceof LibraryFetchError) return { type: 'catalog_unavailable', error };
  // The rendered YAML goes through the shared create path, whose validation
  // errors `handleRouteError` maps to a 400.
  if (
    error instanceof InvalidYamlSyntaxError ||
    error instanceof InvalidYamlSchemaError ||
    (error instanceof Error && isWorkflowValidationError(error))
  ) {
    return { type: 'workflow_invalid', error };
  }
  return { type: 'unknown', error };
};
