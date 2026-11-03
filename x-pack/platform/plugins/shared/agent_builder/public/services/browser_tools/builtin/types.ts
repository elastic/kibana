/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { RefStore } from './snapshot/ref_store';

export interface BuiltinToolDeps {
  application: ApplicationStart;
  refStore: RefStore;
  /** Defaults to `window.document`. */
  document?: Document;
}
