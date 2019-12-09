/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esFields } from './es_fields';
import { customElements } from './custom_elements';
import { shareableWorkpads } from './shareables';
import { CoreSetup } from '../shim';

export function routes(setup: CoreSetup): void {
  customElements(setup.http.route, setup.elasticsearch);
  esFields(setup.http.route, setup.elasticsearch);
  shareableWorkpads(setup.http.route);
}
