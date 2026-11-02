# @kbn/response-ops-scoped-api-keys

Shared server-side handling of the ES and UIAM API keys that Task Manager, alerting, and alerting v2 store and use on behalf of users.

- `decodeStoredApiKey`, `getUiamApiKeySecret`, `getUiamApiKeyId`: decode stored `base64(id:secret)` and raw `essu_` credentials.
- `runInvalidate`: invalidates API keys queued in a pending-invalidation saved object type, skipping keys that are still in use.
