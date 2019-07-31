/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ValidationError } from '../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';

import { ERROR_CODES } from './constants';

/**
 *  Error creators
 */

export const nameConflictError = (conflictPaths: string[]): ValidationError => ({
  code: ERROR_CODES.NAME_CONFLICT,
  message: 'A field with the same name already exists.',
  conflictPaths,
});
