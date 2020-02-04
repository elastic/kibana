/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APP } from '../../../plugins/console_extensions/common/constants';

// @ts-ignore
import mappings from './mappings';

export function consoleExtensions(kibana: any) {
  return new kibana.Plugin({
    id: APP.id,
    uiExports: {
      mappings,
    },
  });
}
