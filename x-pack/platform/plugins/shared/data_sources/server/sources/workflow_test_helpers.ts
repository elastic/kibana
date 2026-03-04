/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Renders Mustache-style (<%= key %>) templates in workflow YAML with the
 * provided variables. Mirrors the production template rendering in
 * workflow_loader.ts but with fake connector IDs for test isolation.
 */
export const renderWorkflowTemplate = (
  yaml: string,
  templateVars: Record<string, string>
): string => yaml.replace(/<%= ([^%]+) %>/g, (_, key) => templateVars[key.trim()] ?? '');
