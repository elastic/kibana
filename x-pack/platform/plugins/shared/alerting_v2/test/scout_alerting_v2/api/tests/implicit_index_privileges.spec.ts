/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * These specs exercise the Elasticsearch-side *implicit* index privileges the
 * `KibanaAlertsImplicitPrivilegesProvider` grants (elastic/elasticsearch#148331):
 * a role that holds the Kibana `alerts:read` application privilege (via the
 * `alerting_v2_alerts` feature) implicitly gains `read` on `.alert-actions*` and
 * `.rule-events*`, document-level-security-scoped by `space_id`. There are no
 * Kibana routes involved - we talk to Elasticsearch directly (`esClient`) to
 * observe the grant and its DLS filter.
 *
 * Each persona (an ES role + a native ES user holding it) is created once in the
 * `beforeAll` hook and torn down in `afterAll`; the individual tests below stay
 * explicit - one named test per assertion - so a failure points straight at the
 * exact role and behavior that broke.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { EsClient, KibanaRole } from '@kbn/scout';
import { apiTest, buildAlertEvent, testData } from '../fixtures';

const { ALERT_EVENTS_DATA_STREAM, ALERT_ACTIONS_DATA_STREAM } = testData;

// The two index patterns the provider grants read on; also what a search must target so an
// unauthorized identity resolves to "no index" (empty) rather than a 403.
const ALERT_EVENTS_INDEX_PATTERN = `${ALERT_EVENTS_DATA_STREAM}*`;
const ALERT_ACTIONS_INDEX_PATTERN = `${ALERT_ACTIONS_DATA_STREAM}*`;
// Both patterns share a single implicit grant with one DLS filter.
const IMPLICIT_INDEX_PATTERNS = [ALERT_EVENTS_INDEX_PATTERN, ALERT_ACTIONS_INDEX_PATTERN].sort();

// Unique marker so concurrent alerting_v2 specs sharing these data streams never leak documents
// into these assertions.
const TEST_SOURCE = 'scout-implicit-priv';
const NATIVE_USER_PASSWORD = 'changeme-implicit-priv';

// Spaces the seeded rule-events documents live in. `default` always exists, and `marketing` with
// `finance` are created in the setup hook so the space-scoped custom roles resolve to real
// `space:<id>` resources.
const SEEDED_SPACES = ['default', 'finance', 'marketing'] as const;
const EXTRA_SPACES = ['marketing', 'finance'] as const;
const ALL_SEEN = [...SEEDED_SPACES].sort();

/** Shape produced by {@link summarizeImplicitGrant} for a role's `.rule-events*` grant. */
interface ImplicitGrantSummary {
  /** Number of implicit grants that cover `.rule-events*` (expected 0 or 1). */
  count: number;
  /** Index patterns of the grant (sorted); only set when `count === 1`. */
  names?: string[];
  /** Index privileges of the grant (sorted); only set when `count === 1`. */
  privileges?: string[];
  /** `space_id`s in the DLS filter (sorted); `[]` = no DLS (full access). */
  spaceIds?: string[];
}

/** A grant covering both alerting_v2 index patterns with read + no DLS (all spaces). */
const FULL_GRANT: ImplicitGrantSummary = {
  count: 1,
  names: IMPLICIT_INDEX_PATTERNS,
  privileges: ['read'],
  spaceIds: [],
};

/** No implicit grant surfaced at all (role lacks the `alerts:read` action). */
const NO_GRANT: ImplicitGrantSummary = { count: 0 };

const spaceScopedGrant = (spaceIds: string[]): ImplicitGrantSummary => ({
  ...FULL_GRANT,
  spaceIds: [...spaceIds].sort(),
});

const alertingV2Role = (feature: Record<string, string[]>, spaces: string[]): KibanaRole => ({
  // Deliberately no Elasticsearch index privileges: the ONLY read access to
  // `.rule-events*` must come from the implicit provider, otherwise the DLS
  // assertions would be meaningless.
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature, spaces }],
});

interface Persona {
  /**
   * Either a reserved ES role name (string) used as-is, or a custom Kibana role
   * definition to create - in which case the persona's registry key is used as
   * the created role's name.
   */
  role: string | KibanaRole;
  /** Native ES user assigned the role, used to query `.rule-events*`. */
  user: string;
}

// Registry of test identities. Consumed only by the setup/teardown hooks for bulk create/delete,
// the tests themselves reference each persona explicitly by key.
const PERSONAS = {
  // `viewer` / `editor` / `admin` hold the global Kibana `read` / `all` privilege on `*`, which
  // folds in `alerts:read` -> implicit read on all spaces (no DLS).
  viewer: { role: 'viewer', user: 'impl_priv_viewer' },
  editor: { role: 'editor', user: 'impl_priv_editor' },
  admin: { role: 'kibana_admin', user: 'impl_priv_admin' },

  // Custom roles.
  readAllSpaces: {
    role: alertingV2Role({ alerting_v2_alerts: ['read'] }, ['*']),
    user: 'impl_priv_u_read_all',
  },
  allAllSpaces: {
    role: alertingV2Role({ alerting_v2_alerts: ['all'] }, ['*']),
    user: 'impl_priv_u_all_all',
  },

  readMarketing: {
    role: alertingV2Role({ alerting_v2_alerts: ['read'] }, ['marketing']),
    user: 'impl_priv_u_read_marketing',
  },
  allMarketing: {
    role: alertingV2Role({ alerting_v2_alerts: ['all'] }, ['marketing']),
    user: 'impl_priv_u_all_marketing',
  },

  readMarketingFinance: {
    role: alertingV2Role({ alerting_v2_alerts: ['read'] }, ['marketing', 'finance']),
    user: 'impl_priv_u_read_multi',
  },

  rulesOnly: {
    role: alertingV2Role({ alerting_v2_rules: ['read'] }, ['*']),
    user: 'impl_priv_u_rules_only',
  },
  noAlertingV2: {
    role: alertingV2Role({ discover: ['read'] }, ['*']),
    user: 'impl_priv_u_no_alerting_v2',
  },
} satisfies Record<string, Persona>;

type PersonaKey = keyof typeof PERSONAS;
const PERSONA_KEYS = Object.keys(PERSONAS) as PersonaKey[];

/** ES role name for a persona: the string as-is for a reserved role, else the persona key. */
const roleNameOf = (key: PersonaKey): string => {
  const { role } = PERSONAS[key];
  return typeof role === 'string' ? role : key;
};

interface ImplicitIndexEntry {
  names?: string[];
  privileges?: string[];
  implicitly_granted?: boolean;
  query?: string;
}

const fetchRoleWithImplicit = async (
  esClient: EsClient,
  roleName: string
): Promise<{ indices?: ImplicitIndexEntry[] }> => {
  // `include_implicit` rides along via `querystring` (not yet in the typed request params), and the
  // implicit `indices[].implicitly_granted` / DLS `query` fields aren't in the typed response, so
  // we reinterpret each entry as our own `ImplicitIndexEntry`.
  const response = await esClient.security.getRole({
    name: roleName,
    querystring: { include_implicit: true },
  });
  const roles = response as unknown as Record<string, { indices?: ImplicitIndexEntry[] }>;
  return roles[roleName] ?? { indices: [] };
};

const extractSpaceIds = (query?: string) => {
  return query
    ? [...((JSON.parse(query) as { terms?: { space_id?: string[] } }).terms?.space_id ?? [])].sort()
    : [];
};

const summarizeImplicitGrant = (role: { indices?: ImplicitIndexEntry[] }): ImplicitGrantSummary => {
  const entries = (role.indices ?? []).filter(
    (entry) =>
      entry.implicitly_granted === true && (entry.names ?? []).includes(ALERT_EVENTS_INDEX_PATTERN)
  );
  if (entries.length !== 1) {
    return { count: entries.length };
  }

  const [entry] = entries;
  return {
    count: 1,
    names: [...(entry.names ?? [])].sort(),
    privileges: [...(entry.privileges ?? [])].sort(),
    spaceIds: extractSpaceIds(entry.query),
  };
};

/**
 * Runs a search over `indexPattern` as the given native user and returns the sorted `space_id`s the
 * search actually returned. A denied search (403) or one that resolves to no authorized index is
 * normalized to an empty list, so callers assert visibility without caring which "no access" shape
 * ES produced.
 */
const seenSpaceIds = async (
  esClient: EsClient,
  username: string,
  indexPattern: string
): Promise<string[]> => {
  const authorization = `Basic ${Buffer.from(`${username}:${NATIVE_USER_PASSWORD}`).toString(
    'base64'
  )}`;
  const response = await esClient.search<{ space_id?: string }>(
    {
      index: indexPattern,
      size: 100,
      query: { bool: { filter: [{ term: { source: TEST_SOURCE } }] } },
    },
    { headers: { authorization }, ignore: [403, 404], meta: true }
  );

  return response.statusCode === 200
    ? (response.body.hits?.hits ?? [])
        .map((hit) => hit._source?.space_id)
        .filter((spaceId): spaceId is string => typeof spaceId === 'string')
        .sort()
    : [];
};

apiTest.describe(
  'Alerting v2 alerts implicit index privileges',
  { tag: tags.stateful.classic },
  () => {
    apiTest.beforeAll(async ({ esClient, kbnClient, apiServices }) => {
      // Pre-create spaces.
      for (const id of EXTRA_SPACES) {
        await apiServices.spaces.create({ id });
      }

      // Pre-create custom roles.
      for (const key of PERSONA_KEYS) {
        const { role } = PERSONAS[key];

        // Reserved role, nothing to create.
        if (typeof role === 'string') {
          continue;
        }

        const { status } = await kbnClient.request({
          method: 'PUT',
          path: `/api/security/role/${key}`,
          body: role,
        });
        expect(status).toBe(204);
      }

      // Pre-create native users with the role assigned.
      for (const key of PERSONA_KEYS) {
        const { user } = PERSONAS[key];
        await esClient.security.putUser({
          username: user,
          password: NATIVE_USER_PASSWORD,
          roles: [roleNameOf(key)],
          full_name: user,
        });
      }

      // Seed one alert event + one alert action per space, so both implicitly-granted
      // index patterns carry DLS-filterable documents to assert against.
      const now = new Date().toISOString();
      await apiServices.alertingV2.ruleEvents.cleanUp();
      await apiServices.alertingV2.ruleEvents.seed(
        SEEDED_SPACES.map((space) =>
          buildAlertEvent({
            space_id: space,
            source: TEST_SOURCE,
            rule: { id: `impl-priv-${space}`, version: 1 },
            group_hash: `impl-priv-${space}`,
          })
        )
      );
      await apiServices.alertingV2.alertActionsEvents.cleanUp();
      await apiServices.alertingV2.alertActionsEvents.seed(
        SEEDED_SPACES.map((space) => ({
          '@timestamp': now,
          last_series_event_timestamp: now,
          actor: null,
          action_type: 'ack',
          rule_id: `impl-priv-${space}`,
          group_hash: `impl-priv-${space}`,
          source: TEST_SOURCE,
          space_id: space,
        }))
      );
    });

    apiTest.afterAll(async ({ esClient, apiServices }) => {
      await apiServices.alertingV2.ruleEvents.cleanUp();
      await apiServices.alertingV2.alertActionsEvents.cleanUp();

      // Delete custom user and roles.
      for (const key of PERSONA_KEYS) {
        const { user, role } = PERSONAS[key];
        await esClient.security.deleteUser({ username: user }, { ignore: [404] });
        if (typeof role !== 'string') {
          await esClient.security.deleteRole({ name: key }, { ignore: [404] });
        }
      }

      // Delete custom spaces.
      for (const id of EXTRA_SPACES) {
        await apiServices.spaces.delete(id);
      }
    });

    // --- Built-in roles: implicit read across all spaces (no DLS) --------------
    apiTest('viewer: get-role surfaces read on both patterns with no DLS', async ({ esClient }) => {
      expect(
        summarizeImplicitGrant(await fetchRoleWithImplicit(esClient, roleNameOf('viewer')))
      ).toStrictEqual(FULL_GRANT);
    });

    apiTest(
      'viewer: reads .rule-events and .alert-actions in every space',
      async ({ esClient }) => {
        expect(
          await seenSpaceIds(esClient, PERSONAS.viewer.user, ALERT_EVENTS_INDEX_PATTERN)
        ).toStrictEqual(ALL_SEEN);
        expect(
          await seenSpaceIds(esClient, PERSONAS.viewer.user, ALERT_ACTIONS_INDEX_PATTERN)
        ).toStrictEqual(ALL_SEEN);
      }
    );

    apiTest('editor: get-role surfaces read on both patterns with no DLS', async ({ esClient }) => {
      expect(
        summarizeImplicitGrant(await fetchRoleWithImplicit(esClient, roleNameOf('editor')))
      ).toStrictEqual(FULL_GRANT);
    });

    apiTest(
      'editor: reads .rule-events and .alert-actions in every space',
      async ({ esClient }) => {
        expect(
          await seenSpaceIds(esClient, PERSONAS.editor.user, ALERT_EVENTS_INDEX_PATTERN)
        ).toStrictEqual(ALL_SEEN);
        expect(
          await seenSpaceIds(esClient, PERSONAS.editor.user, ALERT_ACTIONS_INDEX_PATTERN)
        ).toStrictEqual(ALL_SEEN);
      }
    );

    apiTest(
      'kibana_admin: get-role surfaces read on both patterns with no DLS',
      async ({ esClient }) => {
        expect(
          summarizeImplicitGrant(await fetchRoleWithImplicit(esClient, roleNameOf('admin')))
        ).toStrictEqual(FULL_GRANT);
      }
    );

    apiTest(
      'kibana_admin: reads .rule-events and .alert-actions in every space',
      async ({ esClient }) => {
        expect(
          await seenSpaceIds(esClient, PERSONAS.admin.user, ALERT_EVENTS_INDEX_PATTERN)
        ).toStrictEqual(ALL_SEEN);
        expect(
          await seenSpaceIds(esClient, PERSONAS.admin.user, ALERT_ACTIONS_INDEX_PATTERN)
        ).toStrictEqual(ALL_SEEN);
      }
    );

    // --- Custom role: alerts privilege across ALL spaces (no DLS) --------------
    apiTest(
      'custom alerts:read in "*": get-role surfaces read with no DLS',
      async ({ esClient }) => {
        expect(
          summarizeImplicitGrant(await fetchRoleWithImplicit(esClient, roleNameOf('readAllSpaces')))
        ).toStrictEqual(FULL_GRANT);
      }
    );

    apiTest(
      'custom alerts:read in "*": reads .rule-events and .alert-actions in every space',
      async ({ esClient }) => {
        expect(
          await seenSpaceIds(esClient, PERSONAS.readAllSpaces.user, ALERT_EVENTS_INDEX_PATTERN)
        ).toStrictEqual(ALL_SEEN);
        expect(
          await seenSpaceIds(esClient, PERSONAS.readAllSpaces.user, ALERT_ACTIONS_INDEX_PATTERN)
        ).toStrictEqual(ALL_SEEN);
      }
    );

    apiTest(
      'custom alerts:all in "*": get-role surfaces read with no DLS',
      async ({ esClient }) => {
        expect(
          summarizeImplicitGrant(await fetchRoleWithImplicit(esClient, roleNameOf('allAllSpaces')))
        ).toStrictEqual(FULL_GRANT);
      }
    );

    apiTest(
      'custom alerts:all in "*": reads .rule-events and .alert-actions in every space',
      async ({ esClient }) => {
        expect(
          await seenSpaceIds(esClient, PERSONAS.allAllSpaces.user, ALERT_EVENTS_INDEX_PATTERN)
        ).toStrictEqual(ALL_SEEN);
        expect(
          await seenSpaceIds(esClient, PERSONAS.allAllSpaces.user, ALERT_ACTIONS_INDEX_PATTERN)
        ).toStrictEqual(ALL_SEEN);
      }
    );

    // --- Custom role: alerts privilege scoped to a single space (DLS) ----------
    apiTest(
      'custom alerts:read in marketing: get-role DLS is scoped to marketing',
      async ({ esClient }) => {
        expect(
          summarizeImplicitGrant(await fetchRoleWithImplicit(esClient, roleNameOf('readMarketing')))
        ).toStrictEqual(spaceScopedGrant(['marketing']));
      }
    );

    apiTest(
      'custom alerts:read in marketing: reads .rule-events and .alert-actions only in marketing',
      async ({ esClient }) => {
        expect(
          await seenSpaceIds(esClient, PERSONAS.readMarketing.user, ALERT_EVENTS_INDEX_PATTERN)
        ).toStrictEqual(['marketing']);
        expect(
          await seenSpaceIds(esClient, PERSONAS.readMarketing.user, ALERT_ACTIONS_INDEX_PATTERN)
        ).toStrictEqual(['marketing']);
      }
    );

    apiTest(
      'custom alerts:all in marketing: get-role DLS is scoped to marketing',
      async ({ esClient }) => {
        expect(
          summarizeImplicitGrant(await fetchRoleWithImplicit(esClient, roleNameOf('allMarketing')))
        ).toStrictEqual(spaceScopedGrant(['marketing']));
      }
    );

    apiTest(
      'custom alerts:all in marketing: reads .rule-events and .alert-actions only in marketing',
      async ({ esClient }) => {
        expect(
          await seenSpaceIds(esClient, PERSONAS.allMarketing.user, ALERT_EVENTS_INDEX_PATTERN)
        ).toStrictEqual(['marketing']);
        expect(
          await seenSpaceIds(esClient, PERSONAS.allMarketing.user, ALERT_ACTIONS_INDEX_PATTERN)
        ).toStrictEqual(['marketing']);
      }
    );

    // --- Custom role: alerts privilege scoped to multiple spaces (DLS union) ---
    apiTest(
      'custom alerts:read in marketing+finance: get-role DLS covers both spaces',
      async ({ esClient }) => {
        expect(
          summarizeImplicitGrant(
            await fetchRoleWithImplicit(esClient, roleNameOf('readMarketingFinance'))
          )
        ).toStrictEqual(spaceScopedGrant(['marketing', 'finance']));
      }
    );

    apiTest(
      'custom alerts:read in marketing+finance: reads .rule-events and .alert-actions in both spaces',
      async ({ esClient }) => {
        expect(
          await seenSpaceIds(
            esClient,
            PERSONAS.readMarketingFinance.user,
            ALERT_EVENTS_INDEX_PATTERN
          )
        ).toStrictEqual(['finance', 'marketing']);
        expect(
          await seenSpaceIds(
            esClient,
            PERSONAS.readMarketingFinance.user,
            ALERT_ACTIONS_INDEX_PATTERN
          )
        ).toStrictEqual(['finance', 'marketing']);
      }
    );

    // --- Custom role WITHOUT the alerts privilege: no implicit grant -----------
    apiTest(
      'custom alerting_v2 rules only: get-role surfaces no implicit grant',
      async ({ esClient }) => {
        expect(
          summarizeImplicitGrant(await fetchRoleWithImplicit(esClient, roleNameOf('rulesOnly')))
        ).toStrictEqual(NO_GRANT);
      }
    );

    apiTest(
      'custom alerting_v2 rules only: cannot read .rule-events or .alert-actions',
      async ({ esClient }) => {
        expect(
          await seenSpaceIds(esClient, PERSONAS.rulesOnly.user, ALERT_EVENTS_INDEX_PATTERN)
        ).toStrictEqual([]);
        expect(
          await seenSpaceIds(esClient, PERSONAS.rulesOnly.user, ALERT_ACTIONS_INDEX_PATTERN)
        ).toStrictEqual([]);
      }
    );

    apiTest(
      'custom role with no alerting_v2 privilege: get-role surfaces no implicit grant',
      async ({ esClient }) => {
        expect(
          summarizeImplicitGrant(await fetchRoleWithImplicit(esClient, roleNameOf('noAlertingV2')))
        ).toStrictEqual(NO_GRANT);
      }
    );

    apiTest(
      'custom role with no alerting_v2 privilege: cannot read .rule-events or .alert-actions',
      async ({ esClient }) => {
        expect(
          await seenSpaceIds(esClient, PERSONAS.noAlertingV2.user, ALERT_EVENTS_INDEX_PATTERN)
        ).toStrictEqual([]);
        expect(
          await seenSpaceIds(esClient, PERSONAS.noAlertingV2.user, ALERT_ACTIONS_INDEX_PATTERN)
        ).toStrictEqual([]);
      }
    );
  }
);
