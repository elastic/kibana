/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CatalogueNamedFieldDefinition, CatalogueUiHints } from '@kbn/streams-schema';
import { layoutRows, layoutSections } from './layout';
import { definitionOf, itemFieldOf } from './test_helpers';

interface Cell {
  name: string;
  ui?: CatalogueUiHints;
}

const namesOf = (fields: readonly CatalogueNamedFieldDefinition[]) =>
  fields.map(({ name }) => name);

describe('layoutRows', () => {
  it('gives a field without a row a line of its own', () => {
    const cells: Cell[] = [{ name: 'a' }, { name: 'b' }];

    expect(layoutRows(cells)).toEqual([{ cells: [{ name: 'a' }] }, { cells: [{ name: 'b' }] }]);
  });

  it('puts the fields that share a row where the first of them is', () => {
    const cells: Cell[] = [
      { name: 'a', ui: { row: 'target' } },
      { name: 'b' },
      { name: 'c', ui: { row: 'target' } },
      { name: 'd', ui: { row: 'value' } },
    ];

    expect(
      layoutRows(cells).map(({ id, cells: row }) => [id, row.map(({ name }) => name)])
    ).toEqual([
      ['target', ['a', 'c']],
      [undefined, ['b']],
      ['value', ['d']],
    ]);
  });

  it('lays out a move as where the field is and where it goes', () => {
    const rows = layoutRows(itemFieldOf(definitionOf('move_fields'), 'fields').fields);

    expect(rows.map(({ id, cells }) => [id, namesOf(cells)])).toEqual([
      ['from', ['location', 'name']],
      ['to', ['new_location', 'new_name']],
    ]);
  });
});

describe('layoutSections', () => {
  it('splits the fields of a list item by the groups of the definition', () => {
    const { groups } = definitionOf('transform');
    const sections = layoutSections(
      itemFieldOf(definitionOf('transform'), 'statements').fields,
      groups
    );

    expect(sections.map(({ group, fields }) => [group?.id, namesOf(fields)])).toEqual([
      [undefined, ['conditions', 'statements']],
      ['advanced', ['error_mode', 'context', 'shared_cache']],
    ]);
  });

  it('leaves out a group no field asks for', () => {
    const { fields, groups } = definitionOf('transform');

    expect(layoutSections(fields, groups).map(({ group }) => group?.id)).toEqual([undefined]);
  });

  it('keeps a field whose group is not declared', () => {
    const fields: CatalogueNamedFieldDefinition[] = [
      { name: 'a', type: 'string', ui: { group: 'missing' } },
    ];

    expect(layoutSections(fields, []).map(({ fields: section }) => namesOf(section))).toEqual([
      ['a'],
    ]);
  });
});
