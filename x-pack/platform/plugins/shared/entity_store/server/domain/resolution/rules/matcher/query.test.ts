/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import { RESOLUTION_RULE_IDS } from '../../../../../common/domain/resolution_rules/constants';
import { getResolutionRuleConfig } from '../rule_registry';
import { buildMatchGroupsQuery, buildWatermarkQuery } from './query';

const INDEX = '.entities.v2.latest.default';

const requireMatch = (id: (typeof RESOLUTION_RULE_IDS)[keyof typeof RESOLUTION_RULE_IDS]) => {
  const spec = getResolutionRuleConfig(id)?.matcher;
  if (!spec) {
    throw new Error(`Expected matcher spec for ${id}`);
  }
  return spec;
};

const EMAIL = requireMatch(RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH);
const WINDOWS_SID = requireMatch(RESOLUTION_RULE_IDS.WINDOWS_SID_BRIDGE);
const ENTRA_GUID = requireMatch(RESOLUTION_RULE_IDS.ENTRA_GUID_BRIDGE);
const CROWDSTRIKE_SID = requireMatch(RESOLUTION_RULE_IDS.CROWDSTRIKE_SID_BRIDGE);
const UPN = requireMatch(RESOLUTION_RULE_IDS.UPN_CROSS_FIELD_BRIDGE);

describe('ES|QL matcher query builder', () => {
  describe('buildMatchGroupsQuery', () => {
    it.each([
      ['email', EMAIL],
      ['windows SID', WINDOWS_SID],
      ['entra GUID', ENTRA_GUID],
      ['crowdstrike SID', CROWDSTRIKE_SID],
      ['UPN cross-field', UPN],
    ])('emits a valid query for %s', async (_name, spec) => {
      const query = buildMatchGroupsQuery({ index: INDEX, spec });
      expect(query).toMatchSnapshot();
      await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
    });

    it('pages with an exclusive keyset on match_value', async () => {
      const query = buildMatchGroupsQuery({
        index: INDEX,
        spec: EMAIL,
        afterMatchValue: 'alice@corp.com',
        pageSize: 5,
      });
      expect(query).toContain('| WHERE match_value > "alice@corp.com"');
      expect(query).toContain('| LIMIT 5');
      expect(query).toMatchSnapshot();
      await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
    });

    it('restricts groups to those with a member newer than the watermark', async () => {
      const query = buildMatchGroupsQuery({
        index: INDEX,
        spec: EMAIL,
        watermark: '2026-08-01T00:00:00.000Z',
      });
      expect(query).toContain(
        'entity.lifecycle.first_seen > TO_DATETIME("2026-08-01T00:00:00.000Z")'
      );
      expect(query).toContain('| WHERE total_n >= 2 AND new_n >= 1');
      await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
    });

    it('always sets unmapped_fields=nullify and an explicit LIMIT', () => {
      const query = buildMatchGroupsQuery({ index: INDEX, spec: EMAIL, pageSize: 5000 });
      expect(query.startsWith('SET unmapped_fields="nullify";')).toBe(true);
      expect(query).toContain('| LIMIT 5000');
      expect(query).toContain('TOP(unresolved_id, 100, "asc")');
      expect(query).toContain(
        'existing_targets = TOP(entity.relationships.resolution.resolved_to, 100, "asc")'
      );
    });

    it('quotes the latest-entities index name', () => {
      const query = buildMatchGroupsQuery({ index: INDEX, spec: EMAIL });
      expect(query).toContain(`FROM "${INDEX}"`);
    });

    it('gates UPN match values on an @-shaped inclusion pattern', () => {
      const query = buildMatchGroupsQuery({ index: INDEX, spec: UPN });
      expect(query).toContain('match_value RLIKE "[^@]+@[^@]+"');
      expect(UPN.inclusionPattern).toBe('[^@]+@[^@]+');
    });

    it('accepts on-prem UPNs without a dot and rejects values with no @', () => {
      const pattern = new RegExp(`^${UPN.inclusionPattern}$`);
      expect('jane@CORP').toMatch(pattern);
      expect('admin@tenant.onmicrosoft.com').toMatch(pattern);
      expect('hello').not.toMatch(pattern);
      expect('aa534e49-edfd-4541-8256-8bbf34f122b4').not.toMatch(pattern);
    });
  });

  describe('buildWatermarkQuery', () => {
    it('emits a valid max first_seen query', async () => {
      const query = buildWatermarkQuery({ index: INDEX, spec: EMAIL });
      expect(query).toContain('| LIMIT 1');
      expect(query).toMatchSnapshot();
      await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
    });

    it('applies the watermark as a first_seen lower bound', async () => {
      const query = buildWatermarkQuery({
        index: INDEX,
        spec: WINDOWS_SID,
        watermark: '2026-08-01T00:00:00.000Z',
      });
      expect(query).toContain(
        'entity.lifecycle.first_seen > TO_DATETIME("2026-08-01T00:00:00.000Z")'
      );
      await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
    });
  });
});
