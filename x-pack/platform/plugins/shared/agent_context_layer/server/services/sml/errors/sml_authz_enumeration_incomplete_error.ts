/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SmlError } from './sml_error';

/**
 * Thrown when a `_terms_enum` enumeration of a permission field returns
 * `complete: false` (node error / timeout). A partial universe would
 * under-count the corpus's permission set and silently over-authorize the
 * subsequent search, so the search fails closed instead.
 */
export class SmlAuthzEnumerationIncompleteError extends SmlError {}
