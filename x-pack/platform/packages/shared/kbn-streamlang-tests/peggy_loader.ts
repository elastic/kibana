/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Initialize Peggy require hook for .peggy grammar files.
 * This is required for @kbn/tinymath and other packages that use Peggy grammars.
 */
import { requireHook } from '@kbn/peggy';
requireHook();
