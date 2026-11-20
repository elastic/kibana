/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDocument, visit } from 'yaml';
import { detectIndent } from '@kbn/workflows-yaml';
import { appendPathSegment } from './reference_path';

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const PLAIN_NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/**
 * Rewrites `steps.<oldName>` and `steps["<oldName>"]` in every string value of the workflow to
 * point at `newName`, so a renamed step keeps the references to it. A mention in plain prose is
 * rewritten too, as a reference can't be told from text outside `{{ }}`. Returns the input
 * unchanged when nothing refers to the step or the YAML can't be read.
 */
export const rewriteStepReferences = (
  yamlString: string,
  oldName: string,
  newName: string
): string => {
  if (!oldName || oldName === newName) return yamlString;
  const doc = parseDocument(yamlString);
  if (doc.errors.length > 0) return yamlString;

  const replacement = appendPathSegment('steps', newName);
  const patterns = [
    new RegExp(`steps\\[\\s*"${escapeRegExp(JSON.stringify(oldName).slice(1, -1))}"\\s*\\]`, 'g'),
    new RegExp(`steps\\[\\s*'${escapeRegExp(oldName)}'\\s*\\]`, 'g'),
  ];
  const dotPattern = PLAIN_NAME.test(oldName)
    ? new RegExp(`(^|[^A-Za-z0-9_.\\]])steps\\.${escapeRegExp(oldName)}(?![A-Za-z0-9_-])`, 'g')
    : undefined;

  let changed = false;
  visit(doc, {
    Scalar(key, node) {
      if (key === 'key' || typeof node.value !== 'string') return;
      let next = node.value;
      for (const pattern of patterns) next = next.replace(pattern, replacement);
      if (dotPattern) next = next.replace(dotPattern, (_all, before) => `${before}${replacement}`);
      if (next !== node.value) {
        node.value = next;
        changed = true;
      }
    },
  });
  return changed ? doc.toString({ indent: detectIndent(yamlString), lineWidth: 0 }) : yamlString;
};
