# @kbn/response-ops-scoped-api-keys

Shared server-side handling of the ES and UIAM API keys that Task Manager, alerting, and alerting v2 store and use on behalf of users. The reuse-or-grant decision and the invalidation ownership rules live here, so each consumer makes one call.

## Getting credentials

`resolveScopedApiKeys(request, { security, logger }, opts)` returns `{ enabled: false }` when API keys are disabled, or a `credentials` map keyed by the names you pass in.

- `mode: 'reuse'` reuses the caller's API key when the request is authenticated with one; otherwise new keys are granted. `mode: 'grant'` always grants.
- `clone: true` always grants new keys, even for API key requests. Fake requests must clone.
- `storage: 'pair'` returns an ES key and, when UIAM is enabled, a UIAM key. `storage: 'single'` returns one key: UIAM when enabled, ES otherwise.
- Caller keys:
  - A `base64(id:essu_…)` key is treated as UIAM.
  - A raw `essu_` key is reused as UIAM-only with `uiamExternal: true`. Outside serverless it is rejected with a 400.
- UIAM keys are granted first. If a later grant fails, `onKeyCreated` has already been called for each created key so the caller can queue it for invalidation.
- Client mistakes (missing or unparsable authorization header, Cloud key outside serverless) throw a Boom 400. Server failures keep the original error.

`ScopedCredentials.createdByUser` is `true` when the caller's key was reused. Those keys belong to the user and must never be invalidated.

## Other helpers

- `reuseRequestApiKey`, `getApiKeyFromRequest`: read the caller's `ApiKey` credentials without granting.
- `encodeApiKey`, `decodeStoredApiKey`, `getUiamApiKeySecret`, `getUiamApiKeyId`: encode and decode stored `base64(id:secret)` and raw `essu_` credentials.
- `buildApiKeyFakeRequest`: builds a fake request authenticated with a stored key, marking external Cloud keys.
- `getApiKeyInvalidationTargets`: decides which stored keys may be invalidated. User-created keys and raw `essu_` keys without an id are never targeted.
- `runInvalidate`: invalidates API keys queued in a pending-invalidation saved object type, skipping keys that are still in use.
