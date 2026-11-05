# @kbn/response-ops-api-keys

How Response Ops plugins create, store, use and invalidate the API keys their background work runs
with: Elasticsearch (ES) keys, and UIAM (Cloud) keys in serverless.

Each plugin declares a profile once, maps its saved object fields to the shared `ApiKeys` shape,
and registers its own invalidation task. Everything else lives here.

## Lifecycle

```
request ──► create ──► store ──► use ──► invalidate
            │          │         │       │
            │          │         │       ├─ invalidateNow (on delete), returns failures
            │          │         │       ├─ queueInvalidationTargets (pending SOs)
            │          │         │       └─ createInvalidationRunner (the plugin's task)
            │          │         └─ toFakeRequest / buildFakeRequest
            │          └─ ApiKeyStorage: write(keys) ◄─► read(attributes)
            └─ ApiKeysClient.resolve: chooseApiKeySource ─► reuse | clone | grant
```

- **Create**: `chooseApiKeySource` is the one decision. A caller authenticated with an API key has
  its key reused, or cloned when the key is borrowed or the profile sets `reuse: false`. Anyone
  else gets new keys granted. `profile.uiam` decides whether a UIAM key is optional, required, or
  the only key.
- **Store**: `defineApiKeyStorage` maps `ApiKeys` to the plugin's attributes. `read(write(keys))`
  must equal `keys`.
- **Use**: `toFakeRequest` picks the stored credential and marks external UIAM keys so
  Elasticsearch doesn't attach the UIAM shared secret.
- **Invalidate**: user-created keys are never invalidated. `getInvalidationTargets` lists the keys
  Kibana owns.

## Client or function?

Use `ApiKeysClient` for anything that calls the security service (create, `invalidateNow`). It
holds the profile, so every call behaves the same. The store, use and queue helpers are plain
functions with no security dependency.

## Testing a plugin's storage

Every plugin runs the shared conformance suite against its mapper:

```ts
import { describeApiKeyStorage } from '@kbn/response-ops-api-keys-test-helpers';

describeApiKeyStorage('my plugin', myStorage, {
  unsupported: { 'granted ES and UIAM keys': 'stores a single key' },
});
```

## To change X, edit Y

| To change | Edit |
| --- | --- |
| When keys are reused, cloned or granted | `src/create/choose_source.ts` |
| How UIAM and ES keys are granted or rolled back | `src/create/grant.ts` |
| What a reused caller key looks like | `src/create/reuse.ts` |
| One plugin's key names, metadata or UIAM mode | that plugin's profile |
| How a plugin stores keys | that plugin's storage mapper |
| Which credential background work runs with | `src/use/fake_request.ts` |
| Immediate invalidation on delete | `src/invalidate/invalidate_now.ts` |
| The invalidation task's run logic or state | `src/invalidate/task/` |
| UIAM log tags | `src/log_tags.ts` |
