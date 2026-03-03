/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { resolve, join } from 'path';

const SOURCES_DIR = resolve(__dirname, '..', '..', 'server', 'sources');

/**
 * Loads a workflow YAML file from a data source directory and renders
 * Mustache-style templates (<%= key %>) with the provided variables.
 *
 * This mirrors the production loading path in workflow_loader.ts but
 * substitutes fake connector IDs for test isolation.
 */
export const loadDataSourceWorkflow = (
  source: string,
  workflowFile: string,
  templateVars: Record<string, string>
): string => {
  const filePath = join(SOURCES_DIR, source, 'workflows', workflowFile);
  const raw = readFileSync(filePath, 'utf-8');
  return raw.replace(/<%= ([^%]+) %>/g, (_, key) => templateVars[key.trim()] ?? '');
};
