/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isMap, isPair, isScalar, isSeq, parseDocument, Scalar, type Document } from 'yaml';

/** How a parameter is edited. */
export type WorkflowParameterKind = 'string' | 'text' | 'number' | 'boolean' | 'json';

/** One entry of a workflow's `consts` block, the parameters its steps read. */
export interface WorkflowParameter {
  key: string;
  kind: WorkflowParameterKind;
  value: unknown;
  /** The YAML comment above the const. */
  description?: string;
}

export interface WorkflowParameters {
  parameters: WorkflowParameter[];
  /** `every` of the scheduled trigger, when the workflow has one. */
  schedule?: string;
}

/** A schedule interval in minutes, hours or days, such as `1h`. */
export const SCHEDULE_PATTERN = /^[1-9][0-9]{0,3}[mhd]$/;

/** Long single-line values are edited in a text area too. */
const TEXT_AREA_MIN_LENGTH = 120;

const kindOf = (value: unknown): WorkflowParameterKind => {
  if (typeof value === 'string') {
    return value.includes('\n') || value.length > TEXT_AREA_MIN_LENGTH ? 'text' : 'string';
  }
  if (typeof value === 'number') {
    return 'number';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  return 'json';
};

/** Template plumbing such as `no_items: []`, which only stands in for an empty array literal. */
const isPlumbing = (key: string, value: unknown): boolean =>
  key.startsWith('no_') && Array.isArray(value) && value.length === 0;

const commentText = (comment: string | null | undefined): string | undefined => {
  const text = comment
    ?.split('\n')
    .map((line) => line.replace(/^\s?/, ''))
    .join('\n')
    .trim();
  return text ? text : undefined;
};

const scheduledTriggerPath = (doc: Document): Array<string | number> | undefined => {
  const triggers = doc.get('triggers', true);
  if (!isSeq(triggers)) {
    return undefined;
  }
  const position = triggers.items.findIndex(
    (item) => isMap(item) && item.get('type') === 'scheduled'
  );
  return position >= 0 ? ['triggers', position, 'with', 'every'] : undefined;
};

/** The workflow's parameters as declared in its YAML. */
export const readWorkflowParameters = (yaml: string): WorkflowParameters => {
  const doc = parseDocument(yaml);
  const consts = doc.get('consts', true);
  const parameters: WorkflowParameter[] = [];
  if (isMap(consts)) {
    consts.items.forEach((pair, position) => {
      if (!isPair(pair) || !isScalar(pair.key)) {
        return;
      }
      const key = String(pair.key.value);
      const value = doc.getIn(['consts', key]);
      const jsValue = value !== null && typeof value === 'object' ? doc.toJS().consts[key] : value;
      if (isPlumbing(key, jsValue)) {
        return;
      }
      // The first entry's comment is attached to the map itself.
      const description =
        commentText(pair.key.commentBefore) ??
        (position === 0 ? commentText(consts.commentBefore) : undefined);
      parameters.push({
        key,
        kind: kindOf(jsValue),
        value: jsValue,
        ...(description !== undefined && { description }),
      });
    });
  }
  const schedulePath = scheduledTriggerPath(doc);
  const schedule = schedulePath ? doc.getIn(schedulePath) : undefined;
  return {
    parameters,
    ...(typeof schedule === 'string' && { schedule }),
  };
};

/**
 * Writes parameter values and the schedule back into the workflow YAML. Comments, key order and
 * everything else in the document are kept; a multi-line string is written as a block literal.
 */
export const applyWorkflowParameters = (
  yaml: string,
  { values, schedule }: { values: Record<string, unknown>; schedule?: string }
): string => {
  const doc = parseDocument(yaml);
  for (const [key, value] of Object.entries(values)) {
    const existing = doc.getIn(['consts', key], true);
    if (isScalar(existing) && (value === null || typeof value !== 'object')) {
      existing.value = value;
      if (typeof value === 'string' && value.includes('\n')) {
        existing.type = Scalar.BLOCK_LITERAL;
      } else if (existing.type === Scalar.BLOCK_LITERAL || existing.type === Scalar.BLOCK_FOLDED) {
        existing.type = Scalar.QUOTE_DOUBLE;
      }
      continue;
    }
    const node = doc.createNode(value, { flow: true });
    doc.setIn(['consts', key], node);
  }
  const schedulePath = scheduledTriggerPath(doc);
  if (schedule !== undefined && schedulePath) {
    doc.setIn(schedulePath, schedule);
  }
  return doc.toString({ lineWidth: 0 });
};
