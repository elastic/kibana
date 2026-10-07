/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * We are excluding the  @kbn/eslint/scout_require_api_client_in_api_test
 * eslint rule for this file because we do not test APIs but the how the data are persisted on disk.
 */

/* eslint-disable @kbn/eslint/scout_require_api_client_in_api_test */

import { omit } from 'lodash';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import {
  ALERTING_V2_RULES_ALL_ROLE,
  apiTest,
  buildCreateRuleData,
  getRuleUrl,
  testData,
} from '../fixtures';

const BASE_QUERY = 'FROM logs-* | STATS count = COUNT(*) BY host.name';

/**
 * The audit actors are the only fields the storage schema declares nullable, so they are the only
 * legitimate nulls on disk. Everywhere else a PATCH clears a field by removing its key.
 */
const NULLABLE_ROOT_FIELDS = new Set(['createdBy', 'updatedBy']);

/** Dotted paths of every `null` reachable in the stored attributes. */
const findNullPaths = (value: unknown, path: string[] = []): string[] => {
  if (value === null) {
    return [path.join('.')];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findNullPaths(item, [...path, String(index)]));
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !(path.length === 0 && NULLABLE_ROOT_FIELDS.has(key)))
      .flatMap(([key, child]) => findNullPaths(child, [...path, key]));
  }

  return [];
};

/**
 * Asserts what a PATCH persisted, rather than what it returned. `toApiQuery`,
 * `toApiStateTransition` and `toApiArtifacts` all drop keys on the way out of the server, so a
 * response and a GET agree with each other even when the document on disk is wrong.
 */
apiTest.describe('Patch rule saved object', { tag: '@local-stateful-classic' }, () => {
  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest('clears a leaf by removing its key, never by storing null', async ({ apiServices }) => {
    const { rules, ruleSavedObject } = apiServices.alertingV2;
    const created = await rules.create(
      buildCreateRuleData({
        metadata: {
          name: 'patch-clear',
          description: 'original description',
          tags: ['cpu'],
          routing_tags: ['sre'],
        },
        grouping: { fields: ['host.name'] },
        query: { base: BASE_QUERY, breach: { segment: 'WHERE count >= 10' } },
      })
    );

    const before = await ruleSavedObject.getAttributes(created.id);
    expect(before.version).toBe(1);

    await rules.update(created.id, {
      metadata: { description: null, tags: null, routing_tags: null },
      grouping: null,
      query: { breach: null },
    });

    const after = await ruleSavedObject.getAttributes(created.id);

    expect(omit(after, ['updatedAt'])).toStrictEqual({
      ...omit(before, ['grouping', 'updatedAt']),
      metadata: { name: 'patch-clear' },
      query: { base: BASE_QUERY },
      version: 2,
    });

    expect(after.updatedAt).not.toBe(before.updatedAt);
    expect(findNullPaths(after)).toStrictEqual([]);
  });

  apiTest('leaves every branch the body omits byte-identical on disk', async ({ apiServices }) => {
    const { rules, ruleSavedObject } = apiServices.alertingV2;
    const created = await rules.create(
      buildCreateRuleData({
        metadata: {
          name: 'patch-preserve',
          description: 'original description',
          tags: ['cpu', 'memory'],
          routing_tags: ['sre'],
        },
        grouping: { fields: ['host.name'] },
        query: { base: BASE_QUERY, breach: { segment: 'WHERE count >= 10' } },
        state_transition: {
          pending: { count: 2, timeframe: '5m', operator: 'and' },
          recovering: { count: 4 },
        },
        artifacts: [{ id: 'rb-1', type: RUNBOOK_ARTIFACT_TYPE, data: { content: '# Steps' } }],
      })
    );

    const before = await ruleSavedObject.getAttributes(created.id);

    await rules.update(created.id, { metadata: { name: 'patch-preserve-renamed' } });

    const after = await ruleSavedObject.getAttributes(created.id);

    expect(omit(after, ['updatedAt'])).toStrictEqual({
      ...omit(before, ['updatedAt']),
      metadata: { ...before.metadata, name: 'patch-preserve-renamed' },
      version: 2,
    });

    expect(after.updatedAt).not.toBe(before.updatedAt);
  });

  apiTest('merges a nested phase leaf and stores only the nested form', async ({ apiServices }) => {
    const { rules, ruleSavedObject } = apiServices.alertingV2;
    const created = await rules.create(
      buildCreateRuleData({
        metadata: { name: 'patch-nested' },
        state_transition: {
          pending: { count: 2, timeframe: '5m', operator: 'and' },
          recovering: { count: 4 },
        },
      })
    );

    await rules.update(created.id, { state_transition: { pending: { timeframe: '10m' } } });

    const after = await ruleSavedObject.getAttributes(created.id);
    expect(after.state_transition).toStrictEqual({
      pending: { count: 2, timeframe: '10m', operator: 'and' },
      recovering: { count: 4 },
    });
  });

  apiTest(
    'replaces a variant and a list as a unit instead of merging them',
    async ({ apiServices }) => {
      const { rules, ruleSavedObject } = apiServices.alertingV2;
      const created = await rules.create(
        buildCreateRuleData({
          metadata: { name: 'patch-replace', tags: ['cpu', 'memory'] },
          query: { base: BASE_QUERY, breach: { segment: 'WHERE count >= 10' } },
          recovery: { strategy: 'condition', segment: 'WHERE count < 5' },
        })
      );

      await rules.update(created.id, {
        recovery: { strategy: 'no_breach' },
        metadata: { tags: ['disk'] },
      });

      const after = await ruleSavedObject.getAttributes(created.id);
      // The old `segment` goes with the variant it belonged to, rather than lingering on disk.
      expect(after.recovery).toStrictEqual({ strategy: 'no_breach' });
      expect(after.metadata.tags).toStrictEqual(['disk']);
    }
  );

  apiTest('stores a cleared artifacts list as an empty array', async ({ apiServices }) => {
    const { rules, ruleSavedObject } = apiServices.alertingV2;
    const created = await rules.create(
      buildCreateRuleData({
        metadata: { name: 'patch-artifacts' },
        artifacts: [{ id: 'rb-1', type: RUNBOOK_ARTIFACT_TYPE, data: { content: '# Steps' } }],
      })
    );

    await rules.update(created.id, { artifacts: null });

    const after = await ruleSavedObject.getAttributes(created.id);
    expect(after.artifacts).toStrictEqual([]);
    expect(findNullPaths(after)).toStrictEqual([]);
  });

  apiTest(
    'writes nothing when the merged rule is invalid',
    async ({ apiClient, apiServices, requestAuth }) => {
      const { rules, ruleSavedObject } = apiServices.alertingV2;
      const created = await rules.create(
        buildCreateRuleData({
          metadata: { name: 'patch-invalid-merge' },
          state_transition: { pending: { count: 2 }, recovering: { count: 4 } },
        })
      );

      const before = await ruleSavedObject.getAttributes(created.id);

      const credentials: RoleApiCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_ALL_ROLE
      );

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
        body: { state_transition: { pending: { count: null } } },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_RULE_DATA');

      const after = await ruleSavedObject.getAttributes(created.id);
      expect(after).toStrictEqual(before);
    }
  );
});
