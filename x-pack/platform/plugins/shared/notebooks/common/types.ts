/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypedLensByValueInput } from '@kbn/lens-common';

export type LensAttributes = TypedLensByValueInput['attributes'];

export type RunMode = 'auto' | 'manual';

export interface TimeRangeValue {
  from: string;
  to: string;
}

/** Where a dropdown's options come from: its own query, a typed list, or a column of an ES|QL cell. Absent means `query`. */
export type DropdownOptionsSource = 'query' | 'static' | 'cell';

export type InputDefinition =
  | { kind: 'time'; defaultValue: TimeRangeValue; pinned?: boolean }
  | {
      kind: 'dropdown';
      optionsSource?: DropdownOptionsSource;
      optionsQuery: string;
      staticOptions?: string[];
      /** Id of the ES|QL cell whose results feed the options when `optionsSource` is `cell`. */
      optionsCell?: string | null;
      /** Column (of `optionsCell`, or of the options query) whose distinct values become the options; null means the first. */
      optionsColumn?: string | null;
      defaultValue: string | null;
    }
  | {
      kind: 'range';
      min: number;
      max: number;
      step?: number;
      defaultValue: [number, number] | null;
    };

export type InputKind = InputDefinition['kind'];

interface CellBase {
  id: string;
  name: string;
}

export interface EsqlCellDefinition extends CellBase {
  type: 'esql';
  runMode: RunMode;
  query: string;
}

export interface ChartCellDefinition extends CellBase {
  type: 'chart';
  runMode: RunMode;
  /** Id of the ES|QL cell feeding this chart; null until the user picks a source. */
  sourceCell: string | null;
  /** Null until suggestions have produced a first chart for the source output. */
  lensAttributes: LensAttributes | null;
}

export interface MarkdownCellDefinition extends CellBase {
  type: 'markdown';
  content: string;
}

export interface InputCellDefinition extends CellBase {
  type: 'input';
  input: InputDefinition;
}

export type CellDefinition =
  | EsqlCellDefinition
  | ChartCellDefinition
  | MarkdownCellDefinition
  | InputCellDefinition;

export type CellType = CellDefinition['type'];

/** A cell placed on an app's grid, in grid columns and rows. */
export interface AppPanel {
  id: string;
  cellId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A dashboard-style view of some of a notebook's cells. */
export interface NotebookApp {
  id: string;
  title: string;
  panels: AppPanel[];
  /** Hides the global time picker on the app even when its cells use the time range. */
  hideTimePicker?: boolean;
  /** Shown at the top of the app; the tab title is separate and only labels the tab. */
  heading?: string;
  description?: string;
}

export interface NotebookAttributes {
  title: string;
  description?: string;
  cellOrder: string[];
  cells: Record<string, CellDefinition>;
  /** The notebook's apps; absent until the user creates one. */
  panels?: NotebookApp[];
}

export interface NotebookSavedObject {
  id: string;
  attributes: NotebookAttributes;
  updatedAt?: string;
}

export interface NotebookListItem {
  id: string;
  title: string;
  description?: string;
  updatedAt?: string;
}

export interface FindNotebooksResponse {
  total: number;
  notebooks: NotebookListItem[];
}
