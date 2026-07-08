/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SmlError } from './sml_error';

/**
 * Thrown when a list query asks for a window larger than the index's
 * `index.max_result_window` setting.
 */
export class SmlResultWindowExceededError extends SmlError {}
