/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadEntityGraphTraversalPlan } from '@kbn/workflows/managed';
import { buildGraphExpandStatement, relationForColumn } from './build_graph_expand';

const plan = (id: string) => {
  const loaded = loadEntityGraphTraversalPlan(id);
  if (!loaded) throw new Error(`scenario ${id} missing`);
  return loaded;
};

describe('buildGraphExpandStatement', () => {
  describe('endpoint-shared-indicator-spread (inverse hop pair)', () => {
    const statement = buildGraphExpandStatement({
      plan: plan('endpoint-shared-indicator-spread'),
      seedId: 'host:WKSTN-RECV01',
    });

    it('projects the first spec only and walks in both directions', () => {
      expect(statement.direction).toBe('both');
      expect(statement.relations).toEqual(['executed', 'dropped', 'connected_to']);
      expect(statement.query).toContain('FROM logs-endpoint.events.*,logs-endpoint.alerts-*');
      expect(statement.query).not.toContain('observed_on');
      expect(statement.query).toContain('"direction":"both"');
    });

    it('computes the host EUID with the store rules and binds the seed as a parameter', () => {
      expect(statement.params).toEqual(['host:WKSTN-RECV01']);
      expect(statement.query.split('\n').slice(0, 2)).toEqual([
        'SET unmapped_fields="load";',
        'ROW node_id = ?',
      ]);
      expect(statement.query).toContain('__euid_0 = CONCAT("host:"');
      expect(statement.query).toContain('__id = CASE(destination.ip IS NULL OR NOT CIDR_MATCH(');
      expect(statement.query).toContain('ON node_id == __id TO (__rel_0, __rel_1, __rel_2)');
    });

    it('casts every relation value to a string and gates it with the spec filter', () => {
      expect(statement.query).toContain('__rel_2 = CASE(destination.ip IS NULL OR NOT CIDR_MATCH(');
      expect(statement.query).toContain('TO_STRING(`destination.ip`), NULL)');
      expect(statement.query).toContain('TO_STRING(`process.hash.sha256`)');
    });

    it('carries the scenario limits and payload fields', () => {
      expect(statement.query).toContain(
        'STATS __count = COUNT(*), __payload_0 = VALUES(`process.name`), __payload_1 = VALUES(`event.action`)'
      );
      expect(statement.query).toContain('"max_hops":6');
      expect(statement.query).toContain('"hub_degree":200');
      expect(statement.payloadFields).toEqual(['process.name', 'event.action']);
      expect(statement.maxHops).toBe(6);
    });
  });

  describe('okta-user-to-aws-resources (forward chain)', () => {
    const statement = buildGraphExpandStatement({
      plan: plan('okta-user-to-aws-resources'),
      seedId: 'user:john.doe@acmecrm.com@okta',
      lookback: '7d',
      exclusions: [
        { field: 'entity.id', values: ['arn:aws:iam::1:role/skip'] },
        { field: 'entity.sub_type', values: ['AWS S3 Bucket'] },
      ],
    });

    it('unions both indices under one coalesced id', () => {
      expect(statement.direction).toBe('out');
      expect(statement.query).toContain(
        'FROM logs-entityanalytics_okta.user-*,logs-cloud_asset_inventory.asset_inventory-*'
      );
      expect(statement.query).toContain('__euid_0 = CONCAT("user:"');
      expect(statement.query).toContain(
        '__id = COALESCE(__euid_0, CASE(cloud.provider == "aws", TO_STRING(`entity.id`), NULL))'
      );
    });

    it('coalesces the fields that emit the same relation across specs', () => {
      expect(statement.relations).toEqual([
        'can_assume',
        'can_connect',
        'runs_as',
        'grants_access_to',
      ]);
      expect(statement.query).toContain(
        '__rel_0 = COALESCE(TO_STRING(`user.entity.relationships.can_assume.entity.id`), CASE(cloud.provider == "aws", TO_STRING(`entity.relationships.can_assume.entity.id`), NULL))'
      );
      expect(statement.relationTypes).toEqual({
        can_assume: { source_type: 'user', target_type: 'role' },
        can_connect: { source_type: 'asset', target_type: 'asset' },
        runs_as: { source_type: 'asset', target_type: 'asset' },
        grants_access_to: { source_type: 'asset', target_type: 'asset' },
      });
    });

    it('applies lookback, document exclusions and node exclusions as parameters', () => {
      // No hop declares a time field, so the lookback adds nothing.
      expect(statement.query).not.toContain('NOW()');
      expect(statement.query).toContain(
        '| WHERE `entity.sub_type` IS NULL OR NOT (MV_CONTAINS(`entity.sub_type`, ?))'
      );
      expect(statement.query).toContain('| WHERE NOT __id IN (?)');
      expect(statement.params).toEqual([
        'user:john.doe@acmecrm.com@okta',
        'AWS S3 Bucket',
        'arn:aws:iam::1:role/skip',
      ]);
      expect(statement.excludedIds).toEqual(['arn:aws:iam::1:role/skip']);
    });
  });

  it('applies a lookback to every distinct time field, null-safe', () => {
    const statement = buildGraphExpandStatement({
      plan: plan('aws-cloudtrail-observed-activity'),
      seedId: 'arn:aws:iam::1:role/x',
      lookback: '24h',
    });
    expect(statement.query).toContain(
      '| WHERE `@timestamp` IS NULL OR `@timestamp` >= NOW() - 24 hours'
    );
    expect(statement.direction).toBe('out');
  });

  it('maps relation result columns back to labels, and a single TO to its only relation', () => {
    expect(relationForColumn({ relations: ['a', 'b'] }, '__rel_1')).toBe('b');
    expect(relationForColumn({ relations: ['a', 'b'] }, undefined)).toBeUndefined();
    expect(relationForColumn({ relations: ['only'] }, undefined)).toBe('only');
    expect(relationForColumn({ relations: ['a'] }, 'garbage')).toBeUndefined();
  });
});
