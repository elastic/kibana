# Plan: Unify `connectorId` / `inferenceId` into a single argument

## Goal

Make the `chatComplete` API accept a single identifier (`connectorId`) that can be either a Kibana stack connector ID or an Elasticsearch inference endpoint ID, with automatic resolution. The `getConnectorList` endpoint should return both connectors and inference endpoints.

## Current State

The codebase has **two separate paths** (`connectorId` vs `inferenceId`) wired through:

- `ChatCompleteOptions` with optional `connectorId` | `inferenceId` fields
- `isConnectorApiCall` / `isInferenceIdApiCall` discriminator helpers
- `BoundOptions` with both fields
- Separate `createConnectorPipeline` / `createInferenceEndpointPipeline` in `callback_api.ts`
- Separate validation in route schemas requiring exactly one of the two

---

## Changes

### 1. Unify `ChatCompleteOptions` type

**File:** `packages/shared/ai-infra/inference-common/src/chat_complete/api.ts`

- Replace `connectorId?: string` / `inferenceId?: string` with a single required `connectorId: string`
- Remove `isConnectorApiCall` and `isInferenceIdApiCall` helper functions
- Remove `ChatCompleteOptionsBase` (fold back into `ChatCompleteOptions` since there is no longer a discriminated union)
- Update JSDoc to explain that `connectorId` accepts both connector IDs and inference endpoint IDs

### 2. Unify `BoundOptions`

**File:** `packages/shared/ai-infra/inference-common/src/bind/bind_api.ts`

- Remove `inferenceId` from `BoundOptions`, keep only `connectorId`
- Update `bindApi` to only destructure/spread `connectorId`

### 3. Create `InferenceEndpointIdCache`

**New file:** `server/util/inference_endpoint_id_cache.ts`

Create an in-memory cache service that maintains a `Set<string>` of known inference endpoint IDs, refreshed periodically via `GET /_inference`.

Key properties:

- **TTL-based:** re-fetches the full list from ES only when the cache is older than `ttlMs` (default 5 min)
- **Coalesced refreshes:** concurrent callers share the same in-flight refresh promise, preventing thundering-herd
- **Plugin-scoped:** instantiated once in `InferencePlugin.start()` and passed to clients
- **Invalidation:** exposes `invalidate()` for callers that know the set has changed (e.g. after creating a new endpoint)
- **Fallback-safe:** if the cache says an ID is not an inference endpoint but the connector path also fails, fall back to the inference endpoint path as a last resort and call `invalidate()`

```typescript
export class InferenceEndpointIdCache {
  private knownIds: Set<string> = new Set();
  private lastRefresh: number = 0;
  private refreshPromise: Promise<void> | null = null;
  private readonly ttlMs: number;

  constructor(options?: { ttlMs?: number }) {
    this.ttlMs = options?.ttlMs ?? 5 * 60 * 1000;
  }

  async has(id: string, esClient: ElasticsearchClient): Promise<boolean> {
    await this.ensureFresh(esClient);
    return this.knownIds.has(id);
  }

  async ensureFresh(esClient: ElasticsearchClient): Promise<void> {
    if (Date.now() - this.lastRefresh < this.ttlMs) return;
    if (!this.refreshPromise) {
      this.refreshPromise = this.refresh(esClient).finally(() => {
        this.refreshPromise = null;
      });
    }
    await this.refreshPromise;
  }

  private async refresh(esClient: ElasticsearchClient): Promise<void> {
    const endpoints = await getInferenceEndpoints({ esClient });
    this.knownIds = new Set(endpoints.map(ep => ep.inferenceId));
    this.lastRefresh = Date.now();
  }

  invalidate(): void {
    this.lastRefresh = 0;
  }
}
```

### 4. Add resolution logic in the callback API

**File:** `server/chat_complete/callback_api.ts`

This is the core change. Replace `isConnectorApiCall`/`isInferenceIdApiCall` branching with cache-based resolution:

1. Check `endpointIdCache.has(connectorId)`
2. If **true** → route through `createInferenceEndpointPipeline`
3. If **false** → route through `createConnectorPipeline`
4. If connector path throws "not found" → try inference endpoint path as fallback, call `cache.invalidate()`

Update `ChatCompleteApiWithCallbackInitOptions` to just `{ connectorId: string }` instead of `{ connectorId: string } | { inferenceId: string }`.

### 5. Update `createChatCompleteApi`

**File:** `server/chat_complete/api.ts`

Simplify to just pass `connectorId` through — no more branching on `isConnectorApiCall`/`isInferenceIdApiCall`.

### 6. Update route schemas

**File:** `server/routes/schemas.ts`

- Remove `inferenceId` from `chatCompleteBaseSchema`
- Make `connectorId` required (remove `schema.maybe`)
- Remove the custom `validate` function that checks for exactly one of `connectorId`/`inferenceId`

### 7. Update HTTP API types

**File:** `common/http_apis.ts`

- Collapse `ChatCompleteRequestBodyBase` from a union type into a single interface with `connectorId: string` plus common fields
- Remove `inferenceId` throughout

### 8. Update route handlers

**Files:** `server/routes/chat_complete.ts`, `server/routes/prompt.ts`

- Remove `isConnectorApiCall`/`isInferenceIdApiCall` branching
- Always pass `connectorId: request.body.connectorId`

### 9. Update REST client

**File:** `common/rest/chat_complete.ts`

- Remove `isConnectorApiCall` branching
- Always construct body with `connectorId`

### 10. Extend `getConnectorList` to include inference endpoints

**File:** `server/util/get_connector_list.ts`

- Accept an additional `esClient: ElasticsearchClient` parameter
- After fetching stack connectors, also call `getInferenceEndpoints({ esClient, taskType: 'chat_completion' })`
- Map inference endpoints into the `InferenceConnector` shape (see step 11)
- Deduplicate: `.inference` stack connectors that reference a matching inference endpoint ID should not appear twice
- Return the combined list
- Can leverage the `InferenceEndpointIdCache` pre-fetched data to avoid a redundant `GET /_inference` call

### 11. Extend `InferenceConnector` type

**File:** `packages/shared/ai-infra/inference-common/src/connectors/connectors.ts`

Add an optional flag so consumers can distinguish inference endpoints from connectors if needed:

- Add `isInferenceEndpoint?: boolean` to `InferenceConnector`
- For inference endpoints mapped into this shape, `connectorId` holds the `inferenceId` value and `isInferenceEndpoint` is `true`

This preserves backward compatibility — existing consumers that don't care about the distinction can ignore the field.

### 12. Update connectors route

**File:** `server/routes/connectors.ts`

- Obtain `esClient` from core start services and pass it to the updated `getConnectorList`
- Response shape stays the same (array of `InferenceConnector`), just with more entries

### 13. Update plugin wiring

**File:** `server/plugin.ts`

- Instantiate `InferenceEndpointIdCache` in `start()`
- Pass the cache and `esClient` into `createInferenceClient()` → `createChatCompleteCallbackApi()`
- Pass `esClient` into `getConnectorList` calls
- Consider whether `getInferenceEndpoints`/`getInferenceEndpointById` on the start contract can be deprecated or kept for direct access

### 14. Clean up exports

**Files:** `packages/shared/ai-infra/inference-common/src/chat_complete/index.ts` and barrel files

- Remove exports of `isConnectorApiCall`, `isInferenceIdApiCall`

### 15. Update consumers across the codebase

- Search for all usages of `inferenceId` as a `chatComplete` / `output` / `prompt` parameter and replace with `connectorId`
- Search for `isConnectorApiCall` / `isInferenceIdApiCall` usages and remove
- Update tests:
  - `server/chat_complete/api.test.ts`
  - `common/rest/chat_complete.test.ts`
  - `server/routes/` test files
  - `server/chat_complete/callback_api` tests
  - `server/prompt/api.test.ts`

### 16. Update README

**File:** `README.md`

- Update examples to show that `connectorId` now accepts both connector IDs and inference endpoint IDs
- Remove all references to the `inferenceId` parameter

---

## Key Design Decisions

1. **Resolution order:** Cache-based lookup first. If the cache says the ID is a known inference endpoint, use the inference endpoint pipeline. Otherwise, use the connector pipeline. On connector-not-found, fall back to the inference endpoint pipeline and invalidate the cache.

2. **Error handling:** If the ID matches neither an inference endpoint nor a connector, the connector path's existing "No connector found" error surfaces. The fallback attempt to the inference endpoint path will also fail, and that error is the one ultimately thrown (since it was the last thing tried).

3. **Performance:**
   - **Connector calls (majority):** one in-memory `Set.has()` check, zero extra ES calls
   - **Inference endpoint calls:** one in-memory check + the existing `resolveInferenceEndpoint` call
   - **Cold start / cache miss after TTL:** one `GET /_inference` list call, amortized across all subsequent lookups
   - **Coalesced refreshes:** prevents thundering-herd under concurrent requests

4. **Backward compatibility:** The `connectorId` field name is kept, so most consumers need no changes beyond removing `inferenceId` references. The REST API simply drops the `inferenceId` field.

---

## Testing

- **`InferenceEndpointIdCache`:** TTL expiry, coalesced refresh, invalidation, `has()` behavior
- **Resolution logic:** cache hit → endpoint path, cache miss → connector path, connector-not-found → fallback to endpoint + invalidation
- **`getConnectorList`:** returns combined list, deduplicates `.inference` connectors, sets `isInferenceEndpoint` flag
- **Route schemas:** rejects missing `connectorId`, no longer accepts `inferenceId`
- **REST client:** always sends `connectorId` in request body
- **End-to-end:** existing connector-based calls still work, inference endpoint IDs work when passed as `connectorId`
