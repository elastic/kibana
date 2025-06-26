/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectReference } from '@kbn/core/server';
import {
  convertTagNameToId,
  getObjectTags,
  getTag,
  getTagIdsFromReferences,
  replaceTagReferences,
  tagIdToReference,
  updateTagReferences,
} from './references';

const ref = (type: string, id: string): SavedObjectReference => ({
  id,
  type,
  name: `${type}-ref-${id}`,
});

const tagRef = (id: string) => ref('tag', id);

const createObject = (refs: SavedObjectReference[]): SavedObject => {
  return {
    type: 'unkown',
    id: 'irrelevant',
    references: refs,
  } as SavedObject;
};

const createTag = (id: string, name: string = id) => ({
  id,
  name,
  description: `desc ${id}`,
  color: '#FFCC00',
  managed: false,
});

const tag1 = createTag('id-1', 'name-1');
const tag2 = createTag('id-2', 'name-2');
const tag3 = createTag('id-3', 'name-3');

const allTags = [tag1, tag2, tag3];

describe('convertTagNameToId', () => {
  it('returns the id for the given tag name', () => {
    expect(convertTagNameToId('name-2', allTags)).toBe('id-2');
  });

  it('returns undefined if no tag was found', () => {
    expect(convertTagNameToId('name-4', allTags)).toBeUndefined();
  });
});

describe('getObjectTags', () => {
  it('returns the tags for the tag references of the object', () => {
    const { tags } = getObjectTags(
      createObject([tagRef('id-1'), ref('dashboard', 'dash-1'), tagRef('id-3')]),
      allTags
    );

    expect(tags).toEqual([tag1, tag3]);
  });

  it('returns the missing references for tags that were not found', () => {
    const missingRef = tagRef('missing-tag');
    const refs = [tagRef('id-1'), ref('dashboard', 'dash-1'), missingRef];
    const { tags, missingRefs } = getObjectTags(createObject(refs), allTags);

    expect(tags).toEqual([tag1]);
    expect(missingRefs).toEqual([missingRef]);
  });
});

describe('getTag', () => {
  it('returns the tag for the given id', () => {
    expect(getTag('id-2', allTags)).toEqual(tag2);
  });
  it('returns undefined if no tag was found', () => {
    expect(getTag('id-4', allTags)).toBeUndefined();
  });
});

describe('getTagIdsFromReferences', () => {
  it('returns the tag ids from the given references', () => {
    expect(
      getTagIdsFromReferences([
        tagRef('tag-1'),
        ref('dashboard', 'dash-1'),
        tagRef('tag-2'),
        ref('lens', 'lens-1'),
      ])
    ).toEqual(['tag-1', 'tag-2']);
  });
});

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
