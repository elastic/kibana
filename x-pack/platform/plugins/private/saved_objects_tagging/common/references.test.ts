/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from '@kbn/core/types';
import { tagIdToReference, replaceTagReferences, updateTagReferences } from './references';

const ref = (type: string, id: string): SavedObjectReference => ({
  id,
  type,
  name: `${type}-ref-${id}`,
});

const tagRef = (id: string) => ref('tag', id);

describe('tagIdToReference', () => {
  it('returns a reference for given tag id', () => {
    expect(tagIdToReference('some-tag-id')).toEqual({
      id: 'some-tag-id',
      type: 'tag',
      name: 'tag-ref-some-tag-id',
    });
  });
});

describe('replaceTagReferences', () => {
  it('updates the tag references', () => {
    expect(
      replaceTagReferences([tagRef('tag-1'), tagRef('tag-2'), tagRef('tag-3')], ['tag-2', 'tag-4'])
    ).toEqual([tagRef('tag-2'), tagRef('tag-4')]);
  });
  it('leaves the non-tag references unchanged', () => {
    expect(
      replaceTagReferences(
        [ref('dashboard', 'dash-1'), tagRef('tag-1'), ref('lens', 'lens-1'), tagRef('tag-2')],
        ['tag-2', 'tag-4']
      )
    ).toEqual([
      ref('dashboard', 'dash-1'),
      ref('lens', 'lens-1'),
      tagRef('tag-2'),
      tagRef('tag-4'),
    ]);
  });
});

describe('updateTagReferences', () => {
  it('adds the `toAdd` tag references', () => {
    expect(
      updateTagReferences({
        references: [tagRef('tag-1'), tagRef('tag-2')],
        toAdd: ['tag-3', 'tag-4'],
      })
    ).toEqual([tagRef('tag-1'), tagRef('tag-2'), tagRef('tag-3'), tagRef('tag-4')]);
  });

  it('removes the `toRemove` tag references', () => {
    expect(
      updateTagReferences({
        references: [tagRef('tag-1'), tagRef('tag-2'), tagRef('tag-3'), tagRef('tag-4')],
        toRemove: ['tag-1', 'tag-3'],
      })
    ).toEqual([tagRef('tag-2'), tagRef('tag-4')]);
  });

  it('accepts both parameters at the same time', () => {
    expect(
      updateTagReferences({
        references: [tagRef('tag-1'), tagRef('tag-2'), tagRef('tag-3'), tagRef('tag-4')],
        toRemove: ['tag-1', 'tag-3'],
        toAdd: ['tag-5', 'tag-6'],
      })
    ).toEqual([tagRef('tag-2'), tagRef('tag-4'), tagRef('tag-5'), tagRef('tag-6')]);
  });

  it('does not create a duplicate reference when adding an already assigned tag', () => {
    expect(
      updateTagReferences({
        references: [tagRef('tag-1'), tagRef('tag-2')],
        toAdd: ['tag-1', 'tag-3'],
      })
    ).toEqual([tagRef('tag-1'), tagRef('tag-2'), tagRef('tag-3')]);
  });

  it('ignores non-existing `toRemove` ids', () => {
    expect(
      updateTagReferences({
        references: [tagRef('tag-1'), tagRef('tag-2'), tagRef('tag-3')],
        toRemove: ['tag-2', 'unknown'],
      })
    ).toEqual([tagRef('tag-1'), tagRef('tag-3')]);
  });

  it('throws if the same id is present in both `toAdd` and `toRemove`', () => {
    expect(() =>
      updateTagReferences({
        references: [tagRef('tag-1'), tagRef('tag-2'), tagRef('tag-3')],
        toAdd: ['tag-1', 'tag-2'],
        toRemove: ['tag-2', 'tag-3'],
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Some ids from 'toAdd' also present in 'toRemove': [tag-2]"`
    );
  });

  it('preserves the non-tag references', () => {
    expect(
      updateTagReferences({
        references: [
          ref('dashboard', 'dash-1'),
          tagRef('tag-1'),
          ref('lens', 'lens-1'),
          tagRef('tag-2'),
        ],
        toAdd: ['tag-3'],
        toRemove: ['tag-1'],
      })
    ).toEqual([
      ref('dashboard', 'dash-1'),
      ref('lens', 'lens-1'),
      tagRef('tag-2'),
      tagRef('tag-3'),
    ]);
  });
});
