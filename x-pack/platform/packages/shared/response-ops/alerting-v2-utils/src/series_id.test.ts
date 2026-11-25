/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeSeriesId, encodeSeriesId, InvalidSeriesIdError, type SeriesRef } from './series_id';

const GROUP_HASH = '98058cb569017ecb6b08b554ecbcb2524ff7dd8971828f4f2e5939c1e6667e56';

const toId = (payload: string): string => Buffer.from(payload, 'utf8').toString('base64url');

describe('encodeSeriesId', () => {
  it('encodes a rule-backed series as base64url of the readable payload', () => {
    expect(
      encodeSeriesId({
        space_id: 'default',
        rule_id: 'cpu-high',
        source: 'internal',
        group_hash: GROUP_HASH,
      })
    ).toBe(toId(`1::rule::default::cpu-high::${GROUP_HASH}`));
  });

  // A fixed vector, so the wire format is pinned independently of `toId`.
  it('encodes an external series as base64url of the readable payload', () => {
    expect(
      encodeSeriesId({
        space_id: 'default',
        source: 'pager::duty',
        group_hash: GROUP_HASH,
      })
    ).toBe(
      'MTo6c291cmNlOjpkZWZhdWx0OjpwYWdlcjo6ZHV0eTo6OTgwNThjYjU2OTAxN2VjYjZiMDhiNTU0ZWNiY2IyNTI0ZmY3ZGQ4OTcxODI4ZjRmMmU1OTM5YzFlNjY2N2U1Ng'
    );
  });

  it('treats a missing source as rule-backed', () => {
    const withSource = encodeSeriesId({
      space_id: 'default',
      rule_id: 'cpu-high',
      source: 'internal',
      group_hash: GROUP_HASH,
    });

    expect(
      encodeSeriesId({ space_id: 'default', rule_id: 'cpu-high', group_hash: GROUP_HASH })
    ).toBe(withSource);
    expect(
      encodeSeriesId({
        space_id: 'default',
        rule_id: 'cpu-high',
        source: null,
        group_hash: GROUP_HASH,
      })
    ).toBe(withSource);
  });

  it('ignores rule_id for an external series', () => {
    expect(
      encodeSeriesId({
        space_id: 'default',
        rule_id: 'cpu-high',
        source: 'pagerduty',
        group_hash: GROUP_HASH,
      })
    ).toBe(toId(`1::source::default::pagerduty::${GROUP_HASH}`));
  });

  it('gives the same group hash different ids per space and per owner', () => {
    const ids = [
      { space_id: 'default', rule_id: 'rule-a' },
      { space_id: 'default', rule_id: 'rule-b' },
      { space_id: 'other', rule_id: 'rule-a' },
      { space_id: 'default', source: 'pagerduty' },
    ].map((ref) => encodeSeriesId({ ...ref, group_hash: GROUP_HASH }));

    expect(new Set(ids).size).toBe(ids.length);
  });

  describe('owner classification (must match the SERIES_ID_EVAL ES|QL expression)', () => {
    // A series is external only when `source` is a non-empty value other than `internal`.
    // Everything else is rule-backed, so it resolves to the rule owner or to `null`, and
    // never to an external id with an empty owner segment, which `decodeSeriesId` rejects.
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['an empty string', ''],
      ['"internal"', 'internal'],
    ])('treats %s as rule-backed', (_name, source) => {
      expect(
        encodeSeriesId({
          space_id: 'default',
          rule_id: 'cpu-high',
          source,
          group_hash: GROUP_HASH,
        })
      ).toBe(toId(`1::rule::default::cpu-high::${GROUP_HASH}`));
    });

    it.each([
      ['null', null],
      ['an empty string', ''],
      ['"internal"', 'internal'],
    ])('has no identity without a rule id when the source is %s', (_name, source) => {
      expect(
        encodeSeriesId({ space_id: 'default', rule_id: null, source, group_hash: GROUP_HASH })
      ).toBeNull();
    });

    it('treats any other source as an external owner', () => {
      expect(
        encodeSeriesId({
          space_id: 'default',
          rule_id: 'cpu-high',
          source: ' ',
          group_hash: GROUP_HASH,
        })
      ).toBe(toId(`1::source::default:: ::${GROUP_HASH}`));
    });
  });

  it('returns null when a rule-backed series has no rule_id', () => {
    expect(encodeSeriesId({ space_id: 'default', group_hash: GROUP_HASH })).toBeNull();
    expect(
      encodeSeriesId({
        space_id: 'default',
        rule_id: null,
        source: 'internal',
        group_hash: GROUP_HASH,
      })
    ).toBeNull();
  });

  it('starts every id with the version prefix', () => {
    const ids = [
      encodeSeriesId({ space_id: 'default', rule_id: 'cpu-high', group_hash: GROUP_HASH }),
      encodeSeriesId({ space_id: 'my-space', source: 'pagerduty', group_hash: GROUP_HASH }),
    ];

    ids.forEach((id) => expect(id?.startsWith('MTo6')).toBe(true));
  });
});

describe('decodeSeriesId', () => {
  const refs: Array<{ name: string; ref: SeriesRef }> = [
    {
      name: 'a slug rule id',
      ref: { space_id: 'default', rule_id: 'cpu-high', group_hash: GROUP_HASH },
    },
    {
      name: 'a UUID rule id',
      ref: {
        space_id: 'default',
        rule_id: '3f9c2a1e-7b4d-4e8a-9c0f-1d2e3f4a5b6c',
        group_hash: GROUP_HASH,
      },
    },
    {
      name: 'a rule id of the maximum length',
      ref: { space_id: 'default', rule_id: 'a'.repeat(150), group_hash: GROUP_HASH },
    },
    {
      name: 'a custom space',
      ref: { space_id: 'my_space-1', rule_id: 'cpu-high', group_hash: GROUP_HASH },
    },
    {
      name: 'a plain source',
      ref: { space_id: 'default', source: 'pagerduty', group_hash: GROUP_HASH },
    },
    {
      name: 'a source containing the separator',
      ref: { space_id: 'default', source: 'pager::duty', group_hash: GROUP_HASH },
    },
    {
      name: 'a source containing slashes and spaces',
      ref: { space_id: 'default', source: 'my team/pager duty', group_hash: GROUP_HASH },
    },
    {
      name: 'a source ending in one colon',
      ref: { space_id: 'default', source: 'pagerduty:', group_hash: GROUP_HASH },
    },
    {
      name: 'a source ending in two colons',
      ref: { space_id: 'default', source: 'pagerduty::', group_hash: GROUP_HASH },
    },
    {
      name: 'a source ending in three colons',
      ref: { space_id: 'default', source: 'pagerduty:::', group_hash: GROUP_HASH },
    },
    {
      name: 'a source starting with colons',
      ref: { space_id: 'default', source: '::pagerduty', group_hash: GROUP_HASH },
    },
    {
      name: 'a source made only of colons',
      ref: { space_id: 'default', source: ':::', group_hash: GROUP_HASH },
    },
    {
      name: 'a source with non-ASCII characters',
      ref: { space_id: 'default', source: 'zürich-🚀-東京', group_hash: GROUP_HASH },
    },
  ];

  it.each(refs)('round-trips $name', ({ ref }) => {
    const id = encodeSeriesId(ref);
    expect(id).not.toBeNull();

    const decoded = decodeSeriesId(id as string);

    expect(decoded).toEqual(
      ref.source != null && ref.source !== 'internal'
        ? {
            kind: 'source',
            space_id: ref.space_id,
            source: ref.source,
            group_hash: ref.group_hash,
          }
        : {
            kind: 'rule',
            space_id: ref.space_id,
            rule_id: ref.rule_id,
            group_hash: ref.group_hash,
          }
    );
    expect(encodeSeriesId({ ...ref, ...decoded })).toBe(id);
  });

  const invalidIds: Array<{ name: string; id: string }> = [
    { name: 'characters outside the base64url alphabet', id: 'not base64url!' },
    { name: 'padding characters', id: `${toId(`1::rule::default::cpu-high::${GROUP_HASH}`)}==` },
    { name: 'an empty string', id: '' },
    { name: 'a length that is not valid base64', id: 'A' },
    { name: 'bytes that are not UTF-8', id: '_w' },
    { name: 'version 0', id: toId(`0::rule::default::cpu-high::${GROUP_HASH}`) },
    { name: 'version 2', id: toId(`2::rule::default::cpu-high::${GROUP_HASH}`) },
    { name: 'an empty version', id: toId(`::rule::default::cpu-high::${GROUP_HASH}`) },
    { name: 'an unknown kind', id: toId(`1::alert::default::cpu-high::${GROUP_HASH}`) },
    { name: 'a payload without an owner', id: toId(`1::rule::default::${GROUP_HASH}`) },
    { name: 'a payload without a hash', id: toId('1::rule::default::cpu-high') },
    { name: 'an empty space', id: toId(`1::rule::::cpu-high::${GROUP_HASH}`) },
    { name: 'an upper-case space', id: toId(`1::rule::Default::cpu-high::${GROUP_HASH}`) },
    { name: 'an empty owner', id: toId(`1::rule::default::::${GROUP_HASH}`) },
    {
      name: 'an owner over the maximum length',
      id: toId(`1::rule::default::${'a'.repeat(151)}::${GROUP_HASH}`),
    },
    { name: 'a short hash', id: toId('1::rule::default::cpu-high::98058cb5') },
    {
      name: 'an upper-case hash',
      id: toId(`1::rule::default::cpu-high::${GROUP_HASH.toUpperCase()}`),
    },
    { name: 'an internal source series', id: toId(`1::source::default::internal::${GROUP_HASH}`) },
  ];

  it.each(invalidIds)('rejects $name', ({ id }) => {
    expect(() => decodeSeriesId(id)).toThrow(InvalidSeriesIdError);
  });
});
