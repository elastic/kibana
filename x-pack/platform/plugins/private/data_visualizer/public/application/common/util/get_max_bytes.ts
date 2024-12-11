/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPluginsStart } from '../../../kibana_services';

// expose the fileUpload plugin's getMaxBytesFormatted for use in ML
// so ML doesn't need to depend on the fileUpload plugin for this one function
export function getMaxBytesFormatted() {
  return getPluginsStart().fileUpload.getMaxBytesFormatted();
}
