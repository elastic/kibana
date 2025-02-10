/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_SUPPORT_LINK } from '../common/constants';
import { CloudConfigType } from './plugin';

export function getSupportUrl(config: CloudConfigType): string {
  let supportUrl = ELASTIC_SUPPORT_LINK;
  if (config.serverless?.project_id) {
    // serverless projects use config.id and config.serverless.project_id
    supportUrl += '?serverless_project_id=' + config.serverless.project_id;
  } else if (config.id) {
    // non-serverless Cloud projects only use config.id
    supportUrl += '?cloud_deployment_id=' + config.id;
  }
  return supportUrl;
}
