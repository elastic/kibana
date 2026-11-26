/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineConfig, mergeConfig } from 'vitest/config';
import preset from '@kbn/vitest/node_preset';

export default mergeConfig(preset, defineConfig({ test: { root: import.meta.dirname } }));
