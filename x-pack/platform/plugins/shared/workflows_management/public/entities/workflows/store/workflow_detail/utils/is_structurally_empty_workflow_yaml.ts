/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { parseDocument } from 'yaml';

/** The workflow minus `triggers` and `steps`: name, description, consts, outputs and the rest. */
const contentOutsideStructure = (yaml: string): Record<string, unknown> | undefined => {
  const doc = parseDocument(yaml);
  if (doc.errors.length > 0) return undefined;
  const root = doc.toJS() as unknown;
  if (typeof root !== 'object' || root === null || Array.isArray(root)) return {};
  return Object.fromEntries(
    Object.entries(root).filter(([key]) => key !== 'triggers' && key !== 'steps')
  );
};

/**
 * True when both YAMLs hold the same content once `triggers` and `steps` are ignored.
 * YAML that does not parse is never the same, so it counts as changed.
 */
export const isSameOutsideStructure = (yaml: string, otherYaml: string): boolean => {
  const content = contentOutsideStructure(yaml);
  const otherContent = contentOutsideStructure(otherYaml);
  return content !== undefined && otherContent !== undefined && isEqual(content, otherContent);
};

/** True when YAML has no triggers and no steps (creation-state empty). */
export const isStructurallyEmptyWorkflowYaml = (yaml: string): boolean => {
  try {
    const doc = parseDocument(yaml);
    const root = doc.toJS() as {
      triggers?: unknown[];
      steps?: unknown[];
    } | null;
    if (!root || typeof root !== 'object') {
      return true;
    }
    const triggerCount = Array.isArray(root.triggers) ? root.triggers.length : 0;
    const stepCount = Array.isArray(root.steps) ? root.steps.length : 0;
    return triggerCount === 0 && stepCount === 0;
  } catch {
    return false;
  }
};
