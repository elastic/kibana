/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadEntityGraphTraversalPlan } from '../../../../common/graph_traversal/scenarios';
import {
  buildEntityLookupQuery,
  buildGraphExpandStatement,
  GRAPH_EXPAND_PREAMBLE,
  relationForField,
} from './build_graph_expand';

const INDEX = '.entities.v2.latest.default-*';
const LOOKUP = '.entities.v2.latest.default-00001';

const plan = (id: string) => {
  const loaded = loadEntityGraphTraversalPlan(id);
  if (!loaded) throw new Error(`scenario ${id} missing`);
  return loaded;
};

describe('buildGraphExpandStatement', () => {
  describe('okta-user-to-aws-resources', () => {
    const statement = buildGraphExpandStatement({
      plan: plan('okta-user-to-aws-resources'),
      indexPattern: INDEX,
      lookupIndex: LOOKUP,
      seedId: 'user:john.doe@acmecrm.com@okta',
    });

    it('walks the entity index on entity.id over the union of the scenario relationships', () => {
      expect(statement.direction).toBe('out');
      expect(statement.targets).toEqual([
        { field: 'entity.relationships.member_of.ids', relation: 'member_of' },
        { field: 'entity.relationships.sso_to_role.ids', relation: 'sso_to_role' },
        { field: 'entity.relationships.can_assume.ids', relation: 'can_assume' },
        { field: 'entity.relationships.can_connect.ids', relation: 'can_connect' },
        { field: 'entity.relationships.runs_as.ids', relation: 'runs_as' },
        { field: 'entity.relationships.grants_access_to.ids', relation: 'grants_access_to' },
      ]);
      expect(statement.query).toBe(
        [
          GRAPH_EXPAND_PREAMBLE,
          'ROW node_id = ?',
          `| GRAPH EXPAND ${INDEX} ON node_id == \`entity.id\``,
          '    TO (`entity.relationships.member_of.ids`, `entity.relationships.sso_to_role.ids`, `entity.relationships.can_assume.ids`, `entity.relationships.can_connect.ids`, `entity.relationships.runs_as.ids`, `entity.relationships.grants_access_to.ids`)',
          '    STATS __count = COUNT(*)',
          '    WITH {"max_hops":7,"max_nodes":1000,"max_frontier":250,"hub_degree":200,"max_edges_per_hop":2000,"direction":"out","closing_edges":false,"hop_fields":["entity.relationships.member_of.ids","entity.relationships.sso_to_role.ids","entity.relationships.can_assume.ids,entity.relationships.can_connect.ids,entity.relationships.runs_as.ids,entity.relationships.grants_access_to.ids","entity.relationships.can_assume.ids,entity.relationships.can_connect.ids,entity.relationships.runs_as.ids,entity.relationships.grants_access_to.ids","entity.relationships.can_assume.ids,entity.relationships.can_connect.ids,entity.relationships.runs_as.ids,entity.relationships.grants_access_to.ids","entity.relationships.can_assume.ids,entity.relationships.can_connect.ids,entity.relationships.runs_as.ids,entity.relationships.grants_access_to.ids","entity.relationships.can_assume.ids,entity.relationships.can_connect.ids,entity.relationships.runs_as.ids,entity.relationships.grants_access_to.ids"]}',
          '| RENAME node_reached AS `entity.id`',
          `| LOOKUP JOIN ${LOOKUP} ON \`entity.id\``,
          '| KEEP node_from, node_to, hop, relation, dropped, __count, `entity.id`, `entity.name`, `entity.type`, `entity.sub_type`, `entity.EngineMetadata.Type`, `entity.source`, `asset.criticality`, `entity.risk.calculated_level`, `entity.risk.calculated_score_norm`, `entity.relationships.resolution.resolved_to`',
          '| LIMIT 2000',
        ].join('\n')
      );
      expect(statement.params).toEqual(['user:john.doe@acmecrm.com@okta']);
      // No payload is aggregated: the reached node's document comes from the join.
      expect(statement.payloadFields).toEqual([]);
      expect(statement.maxHops).toBe(7);
    });

    it('limits the rows to the total-edge limit so the default row limit cannot cut the walk', () => {
      expect(statement.rowLimit).toBe(2000);
      const wider = buildGraphExpandStatement({
        plan: loadEntityGraphTraversalPlan('okta-user-to-aws-resources', {
          max_edges_total: 4500,
        })!,
        indexPattern: INDEX,
        seedId: 'seed',
      });
      expect(wider.rowLimit).toBe(4500);
      expect(wider.query.split('\n').at(-1)).toBe('| LIMIT 4500');
    });

    it('reads the reached node off the joined entity.id column', () => {
      expect(statement.enriched).toBe(true);
      expect(statement.reachedColumn).toBe('entity.id');
    });
  });

  describe('endpoint-shared-indicator-spread', () => {
    it('walks in both directions and binds the seed, exclusions and stop ids as parameters', () => {
      const statement = buildGraphExpandStatement({
        plan: plan('endpoint-shared-indicator-spread'),
        indexPattern: INDEX,
        seedId: 'host:WKSTN-RECV01',
        lookback: '7d',
        exclusions: [
          { field: 'entity.id', values: ['185.220.101.42'] },
          { field: 'entity.sub_type', values: ['IP address'] },
        ],
        until: [{ field: 'entity.id', values: ['host:WIN-FIN-03'] }],
      });
      expect(statement.direction).toBe('both');
      expect(statement.enriched).toBe(false);
      expect(statement.reachedColumn).toBe('node_reached');
      expect(statement.query).toContain(
        '    WHERE `entity.lifecycle.last_seen` >= NOW() - 7 days AND (`entity.sub_type` IS NULL OR NOT (MV_CONTAINS(`entity.sub_type`, ?)))'
      );
      expect(statement.query).toContain('    UNTIL node_reached IN (?)');
      expect(statement.query).toContain(
        '"hub_degree":200,"max_edges_per_hop":2000,"direction":"both"'
      );
      // One entry per expanded hop, each naming that hop's fields.
      expect(statement.query).toContain(
        '"hop_fields":["entity.relationships.executed.ids,entity.relationships.dropped.ids,entity.relationships.connected_to.ids","entity.relationships.executed.ids,entity.relationships.dropped.ids,entity.relationships.connected_to.ids"'
      );
      expect(statement.query).toContain('"exclude":["185.220.101.42"]}');
      expect(statement.query).not.toContain('LOOKUP JOIN');
      expect(statement.params).toEqual(['host:WKSTN-RECV01', 'IP address', 'host:WIN-FIN-03']);
      expect(statement.excludedIds).toEqual(['185.220.101.42']);
      expect(statement.untilIds).toEqual(['host:WIN-FIN-03']);
    });
  });

  it('applies one hop filter shared by every hop and refuses differing ones', () => {
    const base = plan('aws-role-blast-radius');
    const filtered = {
      ...base,
      hops: base.hops.map((hop) => ({ ...hop, filter: 'entity.source == "aws"' })),
    };
    expect(
      buildGraphExpandStatement({ plan: filtered, indexPattern: INDEX, seedId: 'r' }).query
    ).toContain('    WHERE (entity.source == "aws")');

    const differing = {
      ...base,
      hops: base.hops.map((hop, index) => ({
        ...hop,
        filter: index === 0 ? 'entity.source == "aws"' : undefined,
      })),
    };
    expect(() =>
      buildGraphExpandStatement({ plan: differing, indexPattern: INDEX, seedId: 'r' })
    ).toThrow('different filters');
  });

  it('refuses stop conditions on anything but entity.id', () => {
    expect(() =>
      buildGraphExpandStatement({
        plan: plan('aws-role-blast-radius'),
        indexPattern: INDEX,
        seedId: 'r',
        until: [{ field: 'entity.name', values: ['x'] }],
      })
    ).toThrow('only supports stop conditions on entity.id');
  });

  it('maps a relation column back to its key, falling back to the field name convention', () => {
    const targets = [{ field: 'entity.relationships.can_assume.ids', relation: 'can_assume' }];
    expect(relationForField({ targets }, 'entity.relationships.can_assume.ids')).toBe('can_assume');
    expect(relationForField({ targets }, undefined)).toBe('can_assume');
    expect(relationForField({ targets }, 'entity.relationships.owns.ids')).toBe('owns');
    expect(relationForField({ targets: [...targets, ...targets] }, undefined)).toBeUndefined();
  });

  it('builds a one-document lookup for the seed with the join columns', () => {
    const { query, params } = buildEntityLookupQuery(INDEX, 'host:a');
    expect(params).toEqual(['host:a']);
    expect(query).toContain(`FROM ${INDEX}`);
    expect(query).toContain('| WHERE `entity.id` == ?');
    expect(query).toContain('| KEEP entity.id, entity.name, entity.type');
    expect(query).toContain('| LIMIT 1');
  });
  describe('edge documents', () => {
    const statement = buildGraphExpandStatement({
      plan: plan('okta-user-to-aws-resources'),
      indexPattern: INDEX,
      lookupIndex: LOOKUP,
      edgesIndex: 'entities-edges-default',
      seedId: 'user:john.doe@acmecrm.com@okta',
    });

    it('walks the edges index on src to dst, naming the kind field and the kinds per hop', () => {
      expect(statement.edgeDocuments).toBe(true);
      expect(statement.query).toContain(
        ['| GRAPH EXPAND entities-edges-default ON node_id == src', '    TO dst'].join('\n')
      );
      expect(statement.query).toContain(
        '"relation_field":"kind","hop_relations":["member_of","sso_to_role","can_assume,can_connect,runs_as,grants_access_to"'
      );
      expect(statement.query).not.toContain('hop_fields');
      expect(statement.query).toContain('| KEEP node_from, node_to, hop, relation, dropped');
      expect(statement.query.split('\n').at(-1)).toBe('| LIMIT 2000');
    });

    it('maps a relation value to itself', () => {
      expect(statement.targets.map((t) => t.field)).toEqual([
        'member_of',
        'sso_to_role',
        'can_assume',
        'can_connect',
        'runs_as',
        'grants_access_to',
      ]);
      expect(relationForField(statement, 'can_assume')).toBe('can_assume');
    });

    it('applies the lookback to the edge documents', () => {
      const withLookback = buildGraphExpandStatement({
        plan: plan('okta-user-to-aws-resources'),
        indexPattern: INDEX,
        edgesIndex: 'entities-edges-default',
        seedId: 'seed',
        lookback: '30d',
      });
      expect(withLookback.query).toContain('    WHERE `last_seen` >= NOW() - 30 days');
    });

    it('refuses exclusions on entity fields, which edge documents cannot test', () => {
      expect(() =>
        buildGraphExpandStatement({
          plan: plan('okta-user-to-aws-resources'),
          indexPattern: INDEX,
          edgesIndex: 'entities-edges-default',
          seedId: 'seed',
          exclusions: [{ field: 'entity.sub_type', values: ['AWS IAM Policy'] }],
        })
      ).toThrow(/cannot filter entity documents/);
    });
  });
});
