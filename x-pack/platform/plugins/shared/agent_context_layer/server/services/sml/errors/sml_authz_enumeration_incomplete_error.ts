/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SmlError } from './sml_error';

/** Thrown when `_terms_enum` returns `complete: false`. Fails closed to avoid over-authorizing against a partial permission universe. */
export class SmlAuthzEnumerationIncompleteError extends SmlError {}
