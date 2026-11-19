/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SmlError } from './sml_error';

/** Thrown when permission-field distinct values exceed the enumeration ceiling. Fails closed rather than authorize against a truncated universe. */
export class SmlCorpusTooLargeError extends SmlError {}
