/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaUrlConfig } from '../../../../common/types/custom_urls';
import { Job } from '../../new_job/common/job_creator/configs';

export function getTestUrl(job: Job, customUrl: KibanaUrlConfig): Promise<string>;
