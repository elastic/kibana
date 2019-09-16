/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { workpad } from './workpad';
import { esFields } from './es_fields';
import { customElements } from './custom_elements';

export function routes(server) {
  customElements(server);
  esFields(server);
  workpad(server);
}
