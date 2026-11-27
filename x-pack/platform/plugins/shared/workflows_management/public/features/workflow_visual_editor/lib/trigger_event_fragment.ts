/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isMap, parseDocument } from 'yaml';

/** What the form of an event trigger holds: its `connector-id` and its `on.condition`. */
export interface TriggerEventSettings {
  readonly connectorId: string;
  readonly condition: string;
}

const asText = (value: unknown): string =>
  typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);

/** Reads the event settings off a parsed trigger; absent or empty ones are empty text. */
export const readTriggerEventSettings = (
  trigger: Record<string, unknown> | undefined
): TriggerEventSettings => {
  const on = trigger?.on;
  return {
    connectorId: asText(trigger?.['connector-id']),
    condition: asText(
      typeof on === 'object' && on !== null ? (on as Record<string, unknown>).condition : undefined
    ),
  };
};

const rewrite = (
  fragment: string,
  indent: number,
  edit: (root: ReturnType<typeof parseDocument>) => void
): string => {
  const doc = parseDocument(fragment);
  // A document with errors cannot be stringified, so there is nothing to write back into.
  if (doc.errors.length > 0 || !isMap(doc.contents)) return fragment;
  edit(doc);
  return doc.toString({ indent, lineWidth: 0 });
};

/** Sets the trigger's `connector-id`, or removes the key when it is empty. */
export const writeTriggerConnectorId = (
  fragment: string,
  connectorId: string,
  indent: number
): string =>
  rewrite(fragment, indent, (doc) => {
    if (connectorId === '') doc.delete('connector-id');
    else doc.set('connector-id', connectorId);
  });

/** Sets the trigger's `on.condition`, or removes it, and `on` with it when nothing else is left. */
export const writeTriggerCondition = (
  fragment: string,
  condition: string,
  indent: number
): string =>
  rewrite(fragment, indent, (doc) => {
    if (condition.trim() !== '') {
      doc.setIn(['on', 'condition'], condition);
      return;
    }
    if (!doc.hasIn(['on', 'condition'])) return;
    doc.deleteIn(['on', 'condition']);
    const on = doc.get('on');
    if (isMap(on) && on.items.length === 0) doc.delete('on');
  });
