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
  WorkflowValidationError,
} from '@kbn/workflows-yaml';

import { classifyLibraryError } from './classify_library_error';
import { LibraryDisabledError, LibraryFetchError, LibraryNotFoundError } from './errors';

describe('classifyLibraryError', () => {
  it.each([
    ['library_disabled', new LibraryDisabledError()],
    ['form_validation', new InstallFormValidationError([{ field: 'index', reason: 'required' }])],
    ['missing_form_field', new MissingInstallFormFieldError(['index'])],
    ['template_parse', new TemplateParseError('bad yaml', 'invalid-yaml')],
    ['template_not_found', new LibraryNotFoundError('demo')],
    ['catalog_unavailable', new LibraryFetchError('down', 'timeout')],
    ['workflow_invalid', new InvalidYamlSyntaxError('bad yaml')],
    ['workflow_invalid', new InvalidYamlSchemaError('bad schema')],
    ['workflow_invalid', new WorkflowValidationError('invalid', [])],
    ['unknown', new Error('boom')],
    ['unknown', 'not an error'],
  ])('classifies %s', (type, error) => {
    expect(classifyLibraryError(error)).toEqual({ type, error });
  });
});
