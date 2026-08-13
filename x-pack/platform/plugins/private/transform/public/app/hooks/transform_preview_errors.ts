/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PROJECT_ROUTING } from '@kbn/cps-utils';

import { getErrorMessage } from '../../../common/utils/errors';

const SOURCE_INDICES_UNAVAILABLE_ERROR = 'Source indices have been deleted or closed.';

export const isSourceIndexUnavailableError = (error: unknown): boolean =>
  getErrorMessage(error).includes(SOURCE_INDICES_UNAVAILABLE_ERROR);

export const isCustomProjectRouting = (projectRouting?: string): boolean =>
  projectRouting !== undefined &&
  projectRouting !== PROJECT_ROUTING.ALL &&
  projectRouting !== PROJECT_ROUTING.ORIGIN;

export const isProjectScopedSourceIndexUnavailableError = (
  error: unknown,
  projectRouting?: string
): boolean => isCustomProjectRouting(projectRouting) && isSourceIndexUnavailableError(error);
