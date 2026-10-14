/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const INTERNAL_ORIGIN_HEADER = { 'x-elastic-internal-origin': 'kibana' };

/**
 * End-to-end coverage for the `server.xsrf.allowedSchemes` bypass: requests authenticated via a
 * real `Authorization: ApiKey ...` header — resolved through the actual security plugin
 * `HTTPAuthenticationProvider`, not a mocked `getAuthState` — are exempt from the `kbn-xsrf`
 * check on destructive HTTP methods.
 *
 * This is deliberately scoped to Serverless, where `server.xsrf.allowedSchemes` defaults to
 * `['apikey', 'bearer']` (`config/serverless.yml`), so the bypass is exercised without any
 * extra Kibana server configuration. On stateful deployments the setting defaults to `[]`
 * (opt-in); that default, and every other config/scheme permutation, is already covered by the
 * `http_config` and `lifecycle_handlers` unit and integration tests. This suite's only job is
 * to prove the real end-to-end seam: `HTTPAuthenticationProvider` sets
 * `http_authentication_scheme` -> `registerAuth`'s `toolkit.authenticated({ state })` ->
 * `getAuthState` -> `createXsrfPostAuthHandler`.
 *
 * Bearer-token coverage is intentionally omitted here: the only Bearer-issuing fixture
 * available in this environment mints UIAM tokens, which requires a non-MKI local UIAM
 * configuration (`scout_uiam_local`) unrelated to the generic Authorization-header path this
 * feature covers. `createXsrfPostAuthHandler` reads `apikey` and `bearer` identically (a plain
 * `Set.has(scheme)` check), so the ApiKey case below exercises the shared decision code path;
 * the only scheme-specific logic is `HTTPAuthenticationProvider` lower-casing the scheme it
 * parses off the header, which is already unit-tested in `http.test.ts`.
 *
 * The target route is `POST /internal/security/api_key/invalidate`, which invalidates the same
 * API key used to authenticate the request. `POST` is not a stand-in for a "real" destructive
 * method here — Kibana's own core HTTP types classify it as one:
 * `DestructiveRouteMethod = 'post' | 'put' | 'delete' | 'patch'`
 * (`src/core/packages/http/server/src/router/route.ts`). `isSafeMethod` (what
 * `createXsrfPostAuthHandler` checks to decide whether the `kbn-xsrf` requirement even applies)
 * only treats `GET`/`OPTIONS` as safe (`src/core/packages/http/router-server-internal/src/route.ts`);
 * there is no verb-specific branching anywhere in the xsrf check, so this `POST` runs through the
 * exact same code path a `PUT` or `DELETE` would. This also matches existing repo convention —
 * e.g. `src/platform/plugins/shared/data/test/scout/api/tests/search/ese_post_sync.spec.ts` covers
 * xsrf behavior via `POST` too — and the Scout testing docs
 * (`docs/extend/testing/api-auth.md`) group `POST`/`PUT`/`PATCH`/`DELETE` identically as
 * "non-safe" methods requiring `kbn-xsrf`.
 *
 * A genuine PUT or DELETE alternative was considered and ruled out: no ApiKey-auth-compatible
 * PUT/DELETE route exists anywhere in this plugin (or was found elsewhere in the repo) — the only
 * PUT route in this plugin's API-key surface is `update` (see below, proven unusable), and there
 * is no DELETE route at all for API keys (invalidate is POST-only).
 *
 * This route replaces an earlier attempt that targeted `PUT /internal/security/api_key`
 * (update), which updates the same key that authenticates the request. That route turned out to
 * be fundamentally unusable here: Elasticsearch's Update API key API refuses API key
 * authentication outright — "It's not possible to use an API key as the authentication
 * credential for this API. The owner user's credentials are required."
 * (https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-update-api-key).
 * That restriction applies to *any* key, not just self-updates, so the call always failed with a
 * 400 (`illegal_argument_exception: authentication via API key not supported: only the owner
 * user can update an API key`) before the xsrf bypass was meaningfully exercised — the positive
 * case could never pass, regardless of whether the bypass itself worked.
 *
 * Invalidate has no such restriction: Elasticsearch's Invalidate API key API explicitly supports
 * a request that authenticates as the very key it invalidates, via `owner: true` or by naming its
 * own id in `ids`
 * (https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-invalidate-api-key).
 * This test relies on the `owner: true` path — Kibana's route adds it whenever `isAdmin` is
 * false — so it's a genuine, ES-accepted, self-referential, destructive call (the key is unusable
 * afterwards) that only succeeds if the xsrf check was actually bypassed rather than never
 * invoked.
 *
 * It was chosen over the security plugin's "roles" or "role mappings" APIs because those rely on
 * native-realm role management, which real Serverless projects don't support (see
 * `authorization.ts` in `x-pack/platform/test/serverless/api_integration/test_suites/platform_security`,
 * tagged `failsOnMKI`). API key management has no such restriction — it's core to how
 * Serverless authenticates at all.
 */
apiTest.describe(
  'xsrf protection Authorization-scheme bypass (server.xsrf.allowedSchemes)',
  { tag: tags.serverless.security.complete },
  () => {
    apiTest(
      'accepts a self-invalidation request authenticated with a real ApiKey Authorization header and no kbn-xsrf header',
      async ({ apiClient, requestAuth }) => {
        const { apiKey, apiKeyHeader } = await requestAuth.getApiKey('admin');

        const response = await apiClient.post('internal/security/api_key/invalidate', {
          headers: { ...apiKeyHeader, ...INTERNAL_ORIGIN_HEADER },
          body: {
            apiKeys: [{ id: apiKey.id, name: apiKey.name }],
            // `isAdmin: false` makes Kibana's route add `owner: true` to the ES call, which is
            // what allows this request to authenticate as the very key it invalidates.
            isAdmin: false,
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({
          itemsInvalidated: [{ id: apiKey.id, name: apiKey.name }],
          errors: [],
        });
      }
    );

    apiTest(
      'rejects the same request when authenticated with a cookie session (no Authorization-header scheme), even with the bypass enabled',
      async ({ apiClient, samlAuth }) => {
        // A cookie-authenticated session never sets `http_authentication_scheme` — it's only
        // populated by the HTTP `Authorization`-header provider — so it must never benefit from
        // the allowedSchemes bypass, regardless of how permissive the config is. The API key id
        // is a placeholder: a real end-to-end bypass failure would be caught by the exact 400
        // xsrf-rejection body asserted below, since the request must never reach the route
        // handler that would otherwise attempt to invalidate the id against Elasticsearch.
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.post('internal/security/api_key/invalidate', {
          headers: { ...cookieHeader, ...INTERNAL_ORIGIN_HEADER },
          body: {
            apiKeys: [
              {
                id: 'irrelevant-request-must-be-blocked-by-xsrf-before-route-handler-runs',
                name: 'irrelevant',
              },
            ],
            isAdmin: false,
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body).toStrictEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Request must contain a kbn-xsrf header.',
        });
      }
    );
  }
);
