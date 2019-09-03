/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../../common/constants';
import { ExportTypesRegistry } from '../../../types';
import { metadata } from '../metadata';
import { createJobFactory } from './create_job';
import { executeJobFactory } from './execute_job';

export function register(registry: ExportTypesRegistry) {
  registry.register({
    ...metadata,
    jobType: CSV_FROM_SAVEDOBJECT_JOB_TYPE,
    jobContentExtension: 'csv',
    createJobFactory,
    executeJobFactory,
    validLicenses: ['trial', 'basic', 'standard', 'gold', 'platinum'],
  });
}
