/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import { RESOLUTION_RULE_IDS } from '../../../../../common/domain/resolution_rules/constants';
import { getResolutionRuleConfig, type EsqlExpressionMatchSpec } from '../rule_registry';
import { buildMatchGroupsQuery, buildMatcherValidationQuery, buildWatermarkQuery } from './query';

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

    it('escapes control characters in the page cursor so the next page still parses', async () => {
      const query = buildMatchGroupsQuery({
        index: INDEX,
        spec: EMAIL,
        afterMatchValue: 'alice\n"x"\r\tcorp',
      });
      expect(query).toContain('| WHERE match_value > "alice\\n\\"x\\"\\r\\tcorp"');
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

    it('counts unresolved local members of each group', () => {
      const query = buildMatchGroupsQuery({ index: INDEX, spec: EMAIL });
      expect(query).toContain(
        '| EVAL is_unresolved_local = CASE(is_unresolved == 1 AND entity.namespace == "local", 1, 0)'
      );
      expect(query).toContain('unresolved_local_n = SUM(is_unresolved_local)');
    });

    it('quotes the latest-entities index name', () => {
      const query = buildMatchGroupsQuery({ index: INDEX, spec: EMAIL });
      expect(query).toContain(`FROM "${INDEX}"`);
    });

    it('gates SID match values on an account-domain inclusion pattern', () => {
      const query = buildMatchGroupsQuery({ index: INDEX, spec: WINDOWS_SID });
      expect(query).toContain('match_value RLIKE "S-1-5-21-.*"');
      expect(query).toContain(
        'entity.namespace IN ("local", "system", "windows", "active_directory")'
      );
      expect(WINDOWS_SID.inclusionPattern).toBe('S-1-5-21-.*');
      expect(WINDOWS_SID.exclusionPattern).toBe(
        '(S-1-5-18|S-1-5-19|S-1-5-20|S-1-5-32-54[4-9]|S-1-5-32-55[0-4])'
      );
      expect(WINDOWS_SID.declineSameNamespaceDuplicates).toBe(false);
    });

    it('gates leftover CrowdStrike SID matches the same way as the Windows SID bridge', () => {
      const query = buildMatchGroupsQuery({ index: INDEX, spec: CROWDSTRIKE_SID });
      expect(query).toContain('match_value RLIKE "S-1-5-21-.*"');
      expect(query).toContain(
        'NOT match_value RLIKE "(S-1-5-18|S-1-5-19|S-1-5-20|S-1-5-32-54[4-9]|S-1-5-32-55[0-4])"'
      );
      expect(CROWDSTRIKE_SID.exclusionPattern).toBe(WINDOWS_SID.exclusionPattern);
      expect(CROWDSTRIKE_SID.declineSameNamespaceDuplicates).toBe(false);
    });

    it('accepts account-domain SIDs and rejects well-known SIDs and Linux UIDs', () => {
      const pattern = new RegExp(`^${WINDOWS_SID.inclusionPattern}$`);
      expect('S-1-5-21-111-222-333-1104').toMatch(pattern);
      expect('S-1-5-90-0-1').not.toMatch(pattern);
      expect('S-1-5-18').not.toMatch(pattern);
      expect('1000').not.toMatch(pattern);
      expect('jane').not.toMatch(pattern);
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

  describe('expression (custom rule) specs', () => {
    const LOCAL_USERS_TO_AD: EsqlExpressionMatchSpec = {
      namespaces: ['local', 'active_directory'],
      filterExpression:
        'NOT ENDS_WITH(user.name, "$") AND NOT (TO_LOWER(user.name) IN ("administrator", "admin"))',
      matchValueExpression: 'TO_LOWER(user.name)',
      declineSameNamespaceDuplicates: true,
    };

    it('ANDs the filter after the engine filters and stringifies the key', async () => {
      const query = buildMatchGroupsQuery({ index: INDEX, spec: LOCAL_USERS_TO_AD });
      expect(query).toContain(
        [
          '| WHERE entity.EngineMetadata.Type == "user"',
          '    AND entity.namespace IN ("local", "active_directory")',
          '    AND (NOT ENDS_WITH(user.name, "$") AND NOT (TO_LOWER(user.name) IN ("administrator", "admin")))',
          '| EVAL match_value = TO_STRING(TO_LOWER(user.name))',
          '| WHERE match_value IS NOT NULL',
          '    AND MV_COUNT(match_value) == 1',
          '    AND match_value != ""',
        ].join('\n')
      );
      expect(query.startsWith('SET unmapped_fields="nullify";')).toBe(true);
      await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
    });

    it('drops groups whose members all resolve to one target', async () => {
      const query = buildMatchGroupsQuery({ index: INDEX, spec: LOCAL_USERS_TO_AD });
      expect(query).toContain(
        '| EVAL effective_target = COALESCE(entity.relationships.resolution.resolved_to, entity.id)'
      );
      expect(query).toContain(
        'min_target = MIN(effective_target),\n        max_target = MAX(effective_target)'
      );
      expect(query).toContain('| WHERE total_n >= 2 AND new_n >= 1 AND min_target != max_target');
      await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
    });

    it('leaves the OOTB query without the fully-resolved filter', () => {
      const query = buildMatchGroupsQuery({ index: INDEX, spec: EMAIL });
      expect(query).not.toContain('effective_target');
      expect(query).toContain('| WHERE total_n >= 2 AND new_n >= 1\n');
    });

    it('checks single-valued keys on the result, not on a source field', () => {
      const query = buildMatchGroupsQuery({ index: INDEX, spec: LOCAL_USERS_TO_AD });
      expect(query).not.toContain('MV_COUNT(user.name)');
      expect(query).toContain('MV_COUNT(match_value) == 1');
    });

    it('omits the filter clause when the rule has none', () => {
      const query = buildMatchGroupsQuery({
        index: INDEX,
        spec: {
          namespaces: ['okta'],
          matchValueExpression: 'user.name',
          declineSameNamespaceDuplicates: true,
        },
      });
      expect(query).toContain(
        '| WHERE entity.EngineMetadata.Type == "user"\n    AND entity.namespace IN ("okta")\n| EVAL'
      );
    });

    it('uses the same filter and key for the watermark query', async () => {
      const query = buildWatermarkQuery({
        index: INDEX,
        spec: LOCAL_USERS_TO_AD,
        watermark: '2026-08-01T00:00:00.000Z',
      });
      expect(query).toContain('    AND (NOT ENDS_WITH(user.name, "$")');
      expect(query).toContain('    AND entity.relationships.resolution.resolved_to IS NULL');
      expect(query).toContain('| EVAL match_value = TO_STRING(TO_LOWER(user.name))');
      await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
    });

    it('builds a validation query without nullifying unmapped fields', async () => {
      const query = buildMatcherValidationQuery({ index: INDEX, spec: LOCAL_USERS_TO_AD });
      expect(query).not.toContain('unmapped_fields');
      expect(query.startsWith(`FROM "${INDEX}"`)).toBe(true);
      expect(query).toContain('| EVAL raw_match_value = (TO_LOWER(user.name))');
      expect(query.endsWith('| KEEP match_value, raw_match_value\n| LIMIT 0')).toBe(true);
      await expect(validateQuery(query)).resolves.toHaveProperty('errors', []);
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
