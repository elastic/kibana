/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CatalogueFieldGroup,
  CatalogueNamedFieldDefinition,
  CatalogueUiHints,
} from '@kbn/streams-schema';

export interface FieldSection {
  group?: CatalogueFieldGroup;
  fields: CatalogueNamedFieldDefinition[];
}

const orderOf = (field: CatalogueNamedFieldDefinition): number =>
  field.ui?.order ?? Number.MAX_SAFE_INTEGER;

/** Orders fields by `ui.order`; definition order breaks ties. */
export const orderFields = (
  fields: readonly CatalogueNamedFieldDefinition[]
): CatalogueNamedFieldDefinition[] =>
  [...fields].sort((left, right) => orderOf(left) - orderOf(right));

export interface LayoutRow<Cell> {
  /** The `ui.row` the cells share; a cell without one has the row to itself. */
  id?: string;
  cells: Cell[];
}

/** Puts the cells that share a `ui.row` on one row, placed where the first of them is. */
export const layoutRows = <Cell extends { ui?: CatalogueUiHints }>(
  cells: readonly Cell[]
): Array<LayoutRow<Cell>> => {
  const rows: Array<LayoutRow<Cell>> = [];
  const shared = new Map<string, LayoutRow<Cell>>();
  for (const cell of cells) {
    const id = cell.ui?.row;
    const row = id === undefined ? undefined : shared.get(id);
    if (row) {
      row.cells.push(cell);
      continue;
    }
    const created: LayoutRow<Cell> = { id, cells: [cell] };
    rows.push(created);
    if (id !== undefined) {
      shared.set(id, created);
    }
  }
  return rows;
};

/** Ungrouped fields first, then each declared group in `order`. */
export const layoutSections = (
  fields: readonly CatalogueNamedFieldDefinition[],
  groups: readonly CatalogueFieldGroup[] | undefined
): FieldSection[] => {
  const declared = [...(groups ?? [])].sort(
    (left, right) =>
      (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER)
  );
  const declaredIds = new Set(declared.map(({ id }) => id));
  const ungrouped = fields.filter(({ ui }) => !ui?.group || !declaredIds.has(ui.group));
  const sections: FieldSection[] = ungrouped.length > 0 ? [{ fields: ungrouped }] : [];
  for (const group of declared) {
    const grouped = fields.filter(({ ui }) => ui?.group === group.id);
    if (grouped.length > 0) {
      sections.push({ group, fields: grouped });
    }
  }
  return sections;
};
