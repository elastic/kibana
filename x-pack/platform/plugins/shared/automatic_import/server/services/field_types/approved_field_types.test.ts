/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  collectApprovedChangeErrors,
  findRemovedApprovedFields,
  mergeApprovedFieldTypes,
  pinApprovedFieldTypes,
  toApprovedFieldTypes,
} from './approved_field_types';

const field = (name: string, type: string, isEcs = false) => ({ name, type, is_ecs: isEcs });

describe('toApprovedFieldTypes', () => {
  it('keeps ECS and custom leaf fields and leaves out objects', () => {
    expect(
      toApprovedFieldTypes([
        field('bytes', 'long'),
        field('@timestamp', 'date', true),
        field('obj', 'group'),
      ])
    ).toEqual([
      { name: 'bytes', type: 'long' },
      { name: '@timestamp', type: 'date' },
    ]);
  });
});

describe('mergeApprovedFieldTypes', () => {
  it('keeps earlier approved fields and adds the current leaf fields', () => {
    expect(
      mergeApprovedFieldTypes(
        [
          { name: 'old', type: 'long' },
          { name: 'bytes', type: 'keyword' },
        ],
        [field('bytes', 'long'), field('@timestamp', 'date', true), field('obj', 'group')]
      )
    ).toEqual([
      { name: 'old', type: 'long' },
      { name: 'bytes', type: 'long' },
      { name: '@timestamp', type: 'date' },
    ]);
  });
});

describe('collectApprovedChangeErrors', () => {
  it('reports only changes away from the approved type', () => {
    const approved = new Map([['bytes', 'long']]);

    expect(
      collectApprovedChangeErrors(
        [
          { name: 'bytes', type: 'long' },
          { name: 'other', type: 'long' },
        ],
        approved
      )
    ).toEqual([]);
    expect(collectApprovedChangeErrors([{ name: 'bytes', type: 'keyword' }], approved)).toEqual([
      { name: 'bytes', issue: 'approved_field_locked', approved_type: 'long' },
    ]);
  });
});

describe('pinApprovedFieldTypes', () => {
  it('pins approved types and leaves other fields alone', () => {
    const { fieldMapping, errors } = pinApprovedFieldTypes(
      [field('code', 'long'), field('label', 'keyword')],
      new Map([['code', 'keyword']]),
      [{ code: 200 }]
    );

    expect(errors).toEqual([]);
    expect(fieldMapping).toEqual([field('code', 'keyword'), field('label', 'keyword')]);
  });

  it('leaves ECS fields at their ECS type', () => {
    const { fieldMapping, errors } = pinApprovedFieldTypes(
      [field('source.ip', 'ip', true)],
      new Map([['source.ip', 'keyword']]),
      [{ source: { ip: '10.0.0.1' } }]
    );

    expect(errors).toEqual([]);
    expect(fieldMapping).toEqual([field('source.ip', 'ip', true)]);
  });

  it('reports values the approved type cannot store', () => {
    expect(
      pinApprovedFieldTypes([field('label', 'keyword')], new Map([['label', 'long']]), [
        { label: 'a' },
        { label: '7' },
      ]).errors
    ).toEqual([
      {
        name: 'label',
        issue: 'not_numeric',
        failing_documents: 1,
        total_documents: 2,
        approved_type: 'long',
      },
    ]);
  });

  it('reports approved fields that became objects or whose parent became a value', () => {
    expect(
      pinApprovedFieldTypes(
        [field('label.text', 'keyword'), field('user', 'keyword')],
        new Map([
          ['label', 'keyword'],
          ['user.name', 'keyword'],
          ['gone', 'long'],
        ]),
        []
      ).errors
    ).toEqual([
      { name: 'label', issue: 'approved_field_locked', approved_type: 'keyword' },
      { name: 'user.name', issue: 'approved_field_locked', approved_type: 'keyword' },
    ]);
  });
});

describe('findRemovedApprovedFields', () => {
  const approved = new Map([
    ['bytes', 'long'],
    ['event.severity', 'long'],
    ['label', 'keyword'],
    ['gone', 'long'],
  ]);
  const saved = [
    field('bytes', 'long'),
    field('event.severity', 'long', true),
    field('label', 'keyword'),
    field('added', 'keyword'),
  ];

  it('reports approved custom and ECS fields that the new mapping no longer has', () => {
    expect(findRemovedApprovedFields(saved, [field('label', 'keyword')], approved)).toEqual([
      'bytes',
      'event.severity',
    ]);
  });

  it('reports a renamed approved field', () => {
    expect(
      findRemovedApprovedFields(
        saved,
        [
          field('bytes_renamed', 'long'),
          field('event.severity', 'long', true),
          field('label', 'keyword'),
        ],
        approved
      )
    ).toEqual(['bytes']);
  });

  it('ignores fields that were not approved or are already missing from the saved mapping', () => {
    expect(
      findRemovedApprovedFields(
        saved,
        [field('bytes', 'long'), field('event.severity', 'long', true), field('label', 'keyword')],
        approved
      )
    ).toEqual([]);
  });

  it('leaves out approved fields that became objects', () => {
    expect(
      findRemovedApprovedFields(
        saved,
        [
          field('bytes', 'long'),
          field('event.severity', 'long', true),
          field('label.text', 'keyword'),
        ],
        approved
      )
    ).toEqual([]);
  });
});
