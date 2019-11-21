/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { jobSourceConfigurationRT } from '../../../../../common/log_analysis';

export const jobCustomSettingsRT = rt.partial({
  job_revision: rt.number,
  logs_source_config: rt.partial(jobSourceConfigurationRT.props),
});
