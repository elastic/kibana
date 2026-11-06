/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FetchContext } from '@kbn/presentation-publishing';
import type { ESQLControlVariable } from '@kbn/esql-types';

/** What a query returned: its columns and rows. */
export interface CapabilityQueryResult {
  columns: ReadonlyArray<{ name: string; type: string }>;
  rows: ReadonlyArray<ReadonlyArray<unknown>>;
}

/** The data of a component, as the app fetches it: loading, what came back, or why it did not. */
export type CapabilitySourceState =
  | { status: 'loading' }
  | { status: 'success'; data: CapabilityQueryResult }
  | { status: 'error'; message: string };

/**
 * What the app gives the code that draws a capability: its node, and what it needs to do what the
 * app does, without knowing how the app is made.
 */
export interface CapabilityViewProps<Node> {
  node: Node;
  /** The text of a setting with the values of the app put in. */
  text: (value: string) => string;
  /** The period, filters and query of the page the app is on, which is absent until it is known. */
  context: FetchContext | undefined;
  /** The values of the app. */
  state: Readonly<Record<string, string | number | boolean | readonly string[]>>;
  /** The values of the app as the variables of an ES|QL query. */
  esqlVariables: ESQLControlVariable[] | undefined;
  /** Runs an ES|QL query as the person who is looking, with the context and the values of the app. */
  runQuery: (query: string, signal: AbortSignal) => Promise<CapabilityQueryResult>;
  /** Sets a text value of the app. */
  setValue: (key: string, value: string) => void;
  /** The data of the component's own query or source, which the app fetches. Absent when it has none. */
  source: CapabilitySourceState | undefined;
  /** Fetches the data of the app again. */
  retry: () => void;
  /**
   * Runs the actions of the component, with the row that caused them if there is one. What cannot
   * be done is told to the person by the app, and a workflow is put to them first.
   */
  runActions: (
    actions: ReadonlyArray<object>,
    input?: { row?: Readonly<Record<string, unknown>> }
  ) => void;
}
