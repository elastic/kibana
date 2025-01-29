/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { mockHttpRequest } from './setup_environment';

import { setup as jobCreateSetup } from './job_create.helpers';
import { setup as jobListSetup } from './job_list.helpers';
import { setup as jobCloneSetup } from './job_clone.helpers';

export { getRandomString, findTestSubject } from '@kbn/test-jest-helpers';

export { wrapComponent } from './setup_context';

export const pageHelpers = {
  jobCreate: { setup: jobCreateSetup },
  jobList: { setup: jobListSetup },
  jobClone: { setup: jobCloneSetup },
};
