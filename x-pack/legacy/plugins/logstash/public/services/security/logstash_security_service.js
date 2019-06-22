/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';

// todo rename
export const logstashSecurityService = {
  isSecurityEnabled() {
    return Boolean(xpackInfo.get(`features.security`));
  }
};
