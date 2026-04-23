/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildVisualizationConfig as buildVisualizationConfigBase,
  type BuildVisualizationConfigParams,
} from '@kbn/agent-builder-tools-base';
import { generateEsql } from './tools/generate_esql';

export type BuildVisualizationConfigParamsWithoutInjectedGenerateEsql = Omit<
  BuildVisualizationConfigParams,
  'generateEsql'
>;

/**
 * Same as {@link buildVisualizationConfigBase} from `@kbn/agent-builder-tools-base`, with
 * `generateEsql` wired to this package's implementation.
 */
export const buildVisualizationConfig = (
  params: BuildVisualizationConfigParamsWithoutInjectedGenerateEsql
): ReturnType<typeof buildVisualizationConfigBase> =>
  buildVisualizationConfigBase({ ...params, generateEsql });
