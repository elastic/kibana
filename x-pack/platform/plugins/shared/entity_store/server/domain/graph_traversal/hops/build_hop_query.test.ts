/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraversalHop } from '../../../../common/graph_traversal/hop_types';
import { buildHopQuery, HOP_QUERY_PREAMBLE, lookbackToEsqlSpan } from './build_hop_query';

const INDEX = '.entities.v2.latest.default-*';
const LOOKUP = '.entities.v2.latest.default-00001';
const hop: TraversalHop = {
  hop_number: 2,
  name: 'aws_asset_relationships',
  match_field: 'entity.id',
  target_fields: [
    { field: 'entity.relationships.can_assume.ids', relation: 'can_assume' },
    { field: 'entity.relationships.runs_as.ids', relation: 'runs_as' },
  ],
  payload_fields: ['entity.name', 'entity.sub_type'],
  filter: 'entity.source == "cloud_asset_inventory.asset_inventory"',
};

describe('buildHopQuery', () => {
  describe('outbound', () => {
    it('binds the frontier as positional parameters and never interpolates ids', () => {
      const frontier = ['arn:aws:iam::1:role/a', 'arn:aws:iam::1:role/b"; DROP'];
      const { query, params } = buildHopQuery({
        hop,
        index: INDEX,
        targetField: hop.target_fields[0].field,
        frontier,
        limit: 500,
      });
      expect(params).toEqual(frontier);
      expect(query).not.toContain('role/a');
      expect(query).toContain('IN (?, ?)');
    });

    it('produces the expected ES|QL pipeline over the entity index', () => {
      const { query } = buildHopQuery({
        hop,
        index: INDEX,
        targetField: hop.target_fields[0].field,
        frontier: ['x'],
        limit: 500,
        lookback: '7d',
      });
      expect(query).toBe(
        [
          HOP_QUERY_PREAMBLE,
          `FROM ${INDEX}`,
          '| WHERE `entity.id` IN (?) AND `entity.relationships.can_assume.ids` IS NOT NULL',
          '| WHERE (entity.source == "cloud_asset_inventory.asset_inventory")',
          '| WHERE `entity.lifecycle.last_seen` >= NOW() - 7 days',
          '| MV_EXPAND `entity.relationships.can_assume.ids`',
          '| STATS __count = COUNT(*), __payload_0 = VALUES(`entity.name`), __payload_1 = VALUES(`entity.sub_type`) BY __source = `entity.id`, __target = `entity.relationships.can_assume.ids`',
          '| LIMIT 500',
        ].join('\n')
      );
    });

    it('joins each reached id to the lookup index so the payload describes the reached node', () => {
      const { query, params } = buildHopQuery({
        hop: { ...hop, filter: undefined },
        index: INDEX,
        lookupIndex: LOOKUP,
        targetField: hop.target_fields[0].field,
        frontier: ['x'],
        limit: 500,
        exclusions: [{ field: hop.target_fields[0].field, values: ['skip'] }],
      });
      expect(params).toEqual(['x', 'skip']);
      expect(query).toBe(
        [
          HOP_QUERY_PREAMBLE,
          `FROM ${INDEX}`,
          '| WHERE `entity.id` IN (?) AND `entity.relationships.can_assume.ids` IS NOT NULL',
          '| MV_EXPAND `entity.relationships.can_assume.ids`',
          '| WHERE NOT `entity.relationships.can_assume.ids` IN (?)',
          '| EVAL __source = `entity.id`',
          '| RENAME `entity.relationships.can_assume.ids` AS `entity.id`',
          '| KEEP __source, `entity.id`',
          `| LOOKUP JOIN ${LOOKUP} ON \`entity.id\``,
          `| STATS __count = COUNT(*), __payload_0 = VALUES(\`entity.name\`), __payload_1 = VALUES(\`entity.sub_type\`) BY __source, __target = \`entity.id\``,
          '| LIMIT 500',
        ].join('\n')
      );
    });

    it('reads the payload off the frontier document when there is no lookup index to join', () => {
      const { query } = buildHopQuery({
        hop,
        index: INDEX,
        targetField: hop.target_fields[0].field,
        frontier: ['x'],
        limit: 500,
      });
      expect(query).not.toContain('LOOKUP JOIN');
    });

    it('omits the filter and the lookback when the hop and the run set none', () => {
      const { query } = buildHopQuery({
        hop: { ...hop, filter: undefined },
        index: INDEX,
        targetField: hop.target_fields[1].field,
        frontier: ['x'],
        limit: 10,
      });
      expect(query).not.toContain('NOW()');
      expect(query).not.toContain('| WHERE (');
      expect(query).toContain('| STATS __count = COUNT(*)');
      expect(query).toContain('| LIMIT 10');
    });
  });

  describe('inbound', () => {
    it('explodes the pointer field first and matches it against the frontier, reading the document it reaches', () => {
      const { query, params } = buildHopQuery({
        hop,
        index: INDEX,
        targetField: hop.target_fields[0].field,
        frontier: ['role:x', 'role:y'],
        limit: 500,
        inbound: true,
      });
      // The frontier is bound once as a list for MV_INTERSECTS, then per value for the IN.
      expect(params).toEqual([['role:x', 'role:y'], 'role:x', 'role:y']);
      expect(query).toBe(
        [
          HOP_QUERY_PREAMBLE,
          `FROM ${INDEX}`,
          '| WHERE MV_INTERSECTS(`entity.relationships.can_assume.ids`, ?) AND `entity.id` IS NOT NULL',
          '| WHERE (entity.source == "cloud_asset_inventory.asset_inventory")',
          '| MV_EXPAND `entity.relationships.can_assume.ids`',
          '| WHERE `entity.relationships.can_assume.ids` IN (?, ?)',
          `| STATS __count = COUNT(*), __payload_0 = VALUES(\`entity.name\`), __payload_1 = VALUES(\`entity.sub_type\`) BY __source = \`entity.id\`, __target = \`entity.relationships.can_assume.ids\``,
          '| LIMIT 500',
        ].join('\n')
      );
    });
  });

  describe('exclusions', () => {
    it('filters documents on other fields, null-safe, with the values registered after the frontier', () => {
      const { query, params } = buildHopQuery({
        hop,
        index: INDEX,
        targetField: hop.target_fields[0].field,
        frontier: ['x'],
        limit: 10,
        exclusions: [{ field: 'entity.sub_type', values: ['AWS S3 Bucket', 'AWS IAM Policy'] }],
      });
      expect(query).toContain(
        '| WHERE `entity.sub_type` IS NULL OR NOT (MV_CONTAINS(`entity.sub_type`, ?) OR MV_CONTAINS(`entity.sub_type`, ?))'
      );
      expect(params).toEqual(['x', 'AWS S3 Bucket', 'AWS IAM Policy']);
    });

    it('drops excluded values of the pointer field after expansion, not the whole document', () => {
      const targetField = hop.target_fields[0].field;
      const { query, params } = buildHopQuery({
        hop,
        index: INDEX,
        targetField,
        frontier: ['x'],
        limit: 10,
        exclusions: [{ field: targetField, values: ['arn:aws:iam::1:role/excluded'] }],
      });
      expect(query).toContain(
        '| MV_EXPAND `entity.relationships.can_assume.ids`\n| WHERE NOT `entity.relationships.can_assume.ids` IN (?)'
      );
      expect(query).not.toContain('MV_CONTAINS');
      expect(params).toEqual(['x', 'arn:aws:iam::1:role/excluded']);
    });

    it('drops the documents of excluded entity ids, so an excluded node reaches nothing', () => {
      const { query, params } = buildHopQuery({
        hop,
        index: INDEX,
        targetField: hop.target_fields[0].field,
        frontier: ['x'],
        limit: 10,
        exclusions: [{ field: 'entity.id', values: ['role:skip'] }],
        inbound: true,
      });
      expect(query).toContain('| WHERE NOT `entity.id` IN (?)');
      expect(query.indexOf('| WHERE NOT `entity.id`')).toBeLessThan(query.indexOf('| MV_EXPAND'));
      expect(params).toEqual([['x'], 'role:skip', 'x']);
    });
  });

  it('refuses an empty frontier', () => {
    expect(() =>
      buildHopQuery({
        hop,
        index: INDEX,
        targetField: hop.target_fields[0].field,
        frontier: [],
        limit: 10,
      })
    ).toThrow('empty frontier');
  });
});

describe('lookbackToEsqlSpan', () => {
  it('converts m/h/d suffixes to ES|QL time spans', () => {
    expect(lookbackToEsqlSpan('30m')).toBe('30 minutes');
    expect(lookbackToEsqlSpan('24h')).toBe('24 hours');
    expect(lookbackToEsqlSpan('7d')).toBe('7 days');
  });

  it('rejects anything else', () => {
    expect(() => lookbackToEsqlSpan('7 days')).toThrow();
    expect(() => lookbackToEsqlSpan('1w')).toThrow();
  });
  describe('visited', () => {
    it('drops edges onto visited nodes once the pointer field is exploded, ids registered after the frontier', () => {
      const { query, params } = buildHopQuery({
        hop: { ...hop, filter: undefined },
        index: INDEX,
        targetField: hop.target_fields[0].field,
        frontier: ['x'],
        visited: ['seed', 'x'],
        limit: 500,
      });
      expect(params).toEqual(['x', 'seed', 'x']);
      expect(query).toContain(
        [
          '| MV_EXPAND `entity.relationships.can_assume.ids`',
          '| WHERE NOT `entity.relationships.can_assume.ids` IN (?, ?)',
          '| STATS',
        ].join('\n')
      );
    });

    it('drops visited documents before the explode on an inbound query', () => {
      const { query, params } = buildHopQuery({
        hop: { ...hop, filter: undefined },
        index: INDEX,
        targetField: hop.target_fields[0].field,
        frontier: ['role:x'],
        visited: ['seed'],
        limit: 500,
        inbound: true,
      });
      expect(params).toEqual([['role:x'], 'seed', 'role:x']);
      expect(query).toContain(
        [
          '| WHERE NOT `entity.id` IN (?)',
          '| MV_EXPAND `entity.relationships.can_assume.ids`',
          '| WHERE `entity.relationships.can_assume.ids` IN (?)',
        ].join('\n')
      );
    });

    it('adds nothing when there is nothing visited', () => {
      const { query } = buildHopQuery({
        hop,
        index: INDEX,
        targetField: hop.target_fields[0].field,
        frontier: ['x'],
        limit: 500,
      });
      expect(query).not.toContain('WHERE NOT');
    });
  });
  describe('inbound hub cap', () => {
    it('keeps hub_degree + 1 holders per frontier node and joins their payload back', () => {
      const { query, params } = buildHopQuery({
        hop: { ...hop, filter: undefined },
        index: INDEX,
        lookupIndex: LOOKUP,
        targetField: hop.target_fields[0].field,
        frontier: ['role:x'],
        hubDegree: 200,
        limit: 500,
        inbound: true,
      });
      expect(params).toEqual([['role:x'], 'role:x']);
      expect(query).toBe(
        [
          HOP_QUERY_PREAMBLE,
          `FROM ${INDEX}`,
          '| WHERE MV_INTERSECTS(`entity.relationships.can_assume.ids`, ?) AND `entity.id` IS NOT NULL',
          '| MV_EXPAND `entity.relationships.can_assume.ids`',
          '| WHERE `entity.relationships.can_assume.ids` IN (?)',
          '| STATS __reached = TOP(`entity.id`, 201, "asc") BY __target = `entity.relationships.can_assume.ids`',
          '| MV_EXPAND __reached',
          '| RENAME __reached AS `entity.id`',
          `| LOOKUP JOIN ${LOOKUP} ON \`entity.id\``,
          `| STATS __count = COUNT(*), __payload_0 = VALUES(\`entity.name\`), __payload_1 = VALUES(\`entity.sub_type\`) BY __source = \`entity.id\`, __target`,
          '| LIMIT 500',
        ].join('\n')
      );
    });

    it('needs no join when the hop has no payload fields', () => {
      const { query } = buildHopQuery({
        hop: { ...hop, filter: undefined, payload_fields: [] },
        index: INDEX,
        targetField: hop.target_fields[0].field,
        frontier: ['role:x'],
        hubDegree: 2,
        limit: 500,
        inbound: true,
      });
      expect(query).toContain(
        [
          '| STATS __reached = TOP(`entity.id`, 3, "asc") BY __target = `entity.relationships.can_assume.ids`',
          '| MV_EXPAND __reached',
          '| STATS __count = COUNT(*) BY __source = __reached, __target',
        ].join('\n')
      );
      expect(query).not.toContain('LOOKUP JOIN');
    });

    it('falls back to per-edge rows when payload fields cannot be joined back', () => {
      const { query } = buildHopQuery({
        hop: { ...hop, filter: undefined },
        index: INDEX,
        targetField: hop.target_fields[0].field,
        frontier: ['role:x'],
        hubDegree: 2,
        limit: 500,
        inbound: true,
      });
      expect(query).not.toContain('TOP(');
      expect(query).toContain(
        'BY __source = `entity.id`, __target = `entity.relationships.can_assume.ids`'
      );
    });

    it('does not apply outbound', () => {
      const { query } = buildHopQuery({
        hop,
        index: INDEX,
        lookupIndex: LOOKUP,
        targetField: hop.target_fields[0].field,
        frontier: ['x'],
        hubDegree: 2,
        limit: 500,
      });
      expect(query).not.toContain('TOP(');
    });
  });
});
