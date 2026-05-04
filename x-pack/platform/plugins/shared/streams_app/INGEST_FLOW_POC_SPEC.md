# Streams Ingest Flow — POC Spec

A single-screen graph view in the Streams app showing the end-to-end ingest topology: shippers (Fleet agents, agentless integrations, mock Prometheus scrapers) → ingest endpoints (mock Cloud Pipelines, ES bulk) → streams tree (wired + classic), with live throughput, failure-rate signals, health, and quick links into existing edit surfaces.

POC quality. Not feature-flagged unless trivially. Cloud Pipelines and Prometheus are mocked end-to-end (in-memory, deterministic-but-noisy metrics). Fleet, agentless, streams topology, stream throughput, and failure rates are real.

---

## 1. Architecture at a glance

```
┌─────────────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────────┐
│  Shippers (left col)    │    │  Endpoints (middle col)  │    │  Streams (right col)         │
│                         │    │                          │    │                              │
│  ┌ Fleet Agents lane ┐  │ ─► │  Cloud Pipelines (mock)  │ ─► │  Wired stream root           │
│  │ policy groups     │  │    │  (OTLP endpoints, CRUD)  │    │   ├─ child (routed)          │
│  │ → agents          │  │ ─► │                          │    │   │   ├─ grandchild         │
│  └───────────────────┘  │    │  ─────────────────────   │    │   └─ child (routed)         │
│  ┌ Agentless lane ───┐  │    │  ES bulk endpoint        │    │  Classic streams (flat)      │
│  │ pkg policies      │  │ ─► │                          │ ─► │                              │
│  └───────────────────┘  │    │                          │    │  badges: failureRate         │
│  ┌ Prometheus lane ──┐  │    │                          │    │  edges: throughput           │
│  │ scrapers (mock)   │  │ ─► │                          │    │                              │
│  └───────────────────┘  │    │                          │    │                              │
└─────────────────────────┘    └──────────────────────────┘    └──────────────────────────────┘
```

**Single source of truth for the graph**: a typed `FlowGraphPayload` returned by `GET /internal/streams/_flow/graph`. The frontend is a pure renderer over that payload + a poll-driven `FlowThroughputPayload` overlay.

---

## 2. Technology choices

| Layer | Pick | Why |
|---|---|---|
| Page host plugin | `streams_app` (existing) | Already mounted at `/app/streams`, has router + TanStack Query + EUI shell |
| Server APIs | `streams` plugin (existing) + new `_flow/*` routes via `createServerRoute` | Existing typed `streamsRepositoryClient` auto-types the new endpoints |
| Schema validation | `zod` via `@kbn/zod` | Already used by all `createServerRoute` definitions |
| Graph lib | `@xyflow/react` v12 (already in `package.json`) | Reference impl: `fleet/public/components/otel_ui/collector_config_view/graph_view/` |
| Layout lib | `@dagrejs/dagre` v1 (already in `package.json`) | Used in same Fleet OTel UI for compound LR layout |
| State (query) | `useStreamsAppFetch` for graph topology; small `setInterval` hook for throughput poll | Match existing `streams_app` idiom; no new deps |
| State (mutation) | Direct `streamsRepositoryClient.fetch(...)` then `.refresh()` | Same pattern as `ClassicStreamCreationFlyout` |
| Forms | EUI + Emotion | Repo standard |
| i18n | `@kbn/i18n` / `@kbn/i18n-react` | Repo standard |
| Mock store | In-memory `Map`s, plugin-singleton lifetime | No persistence — resets on Kibana restart, by design |
| Mock metrics | Pure deterministic function `f(id, floor(now/5000))` | Reproducible, no flicker between renders within a 5s bucket |
| Fleet integration | `optionalPlugins: ["fleet"]` in `streams/kibana.jsonc`; consume `agentService` + `agentPolicyService` | Cross-plugin contract pattern already used by `content_connectors` |
| Tests | `jest` for pure server logic + mock generators; `scout` UI test for one happy path | Repo standard |

**Do not introduce**: cytoscape, elkjs, react-flow v11, Redux, alternative styling libs, alternative HTTP clients, persistence layers, new UI settings beyond a single optional gate.

---

## 3. Locked contract — `FlowGraphPayload`

**This is the integration boundary.** Once this zod schema lands, every workstream can develop against it independently using fixtures. Owner: workstream **CONTRACT** (one engineer, day 1).

Location: `x-pack/platform/plugins/shared/streams/common/flow/types.ts`, re-exported from `…/streams/common/index.ts` so server + client share the exact same type.

```ts
// ── Shared atoms ─────────────────────────────────────────────────────────────
const flowHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'down', 'unknown']),
  message: z.string().optional(),
});

const flowThroughputSchema = z.object({
  docsPerSec: z.number().nonnegative(),
  bytesPerSec: z.number().nonnegative().optional(),
});

const flowFailureRateSchema = z.object({
  docsPerSec: z.number().nonnegative(),
  lastSeenAt: z.number().int().optional(), // epoch ms
});

// ── Node discriminated union ─────────────────────────────────────────────────
const flowNodeBase = z.object({
  id: z.string(),
  label: z.string(),
  column: z.enum(['shippers', 'endpoints', 'streams']),
  lane: z.enum(['agents', 'agentless', 'prometheus', 'pipelines', 'bulk', 'streams']),
  parentId: z.string().optional(), // grouping (agent → policy group, child stream → parent)
  health: flowHealthSchema.optional(),
  throughput: flowThroughputSchema.optional(),
});

const flowNodeSchema = z.discriminatedUnion('kind', [
  flowNodeBase.extend({ kind: z.literal('agent'),
    agentId: z.string(), policyId: z.string(), hostname: z.string(),
    version: z.string(), agentStatus: z.string() }),
  flowNodeBase.extend({ kind: z.literal('agentPolicy'),
    policyId: z.string(), agentCount: z.number().int() }),
  flowNodeBase.extend({ kind: z.literal('agentlessIntegration'),
    packagePolicyId: z.string(), packageName: z.string(),
    packageTitle: z.string(), autoPolicyId: z.string() }),
  flowNodeBase.extend({ kind: z.literal('prometheusScraper'),
    scraperId: z.string(), targetHost: z.string(), scrapeIntervalSec: z.number().int() }),
  flowNodeBase.extend({ kind: z.literal('cloudPipeline'),
    pipelineId: z.string(), targetStreamName: z.string().optional() }),
  flowNodeBase.extend({ kind: z.literal('bulkEndpoint'),
    url: z.string().optional() }),
  flowNodeBase.extend({ kind: z.literal('wiredStream'),
    streamName: z.string(), processingStepCount: z.number().int(),
    routingRuleCount: z.number().int(),
    failureRate: flowFailureRateSchema.optional() }),
  flowNodeBase.extend({ kind: z.literal('classicStream'),
    streamName: z.string(), dataStream: z.string(),
    failureRate: flowFailureRateSchema.optional() }),
]);

// ── Edge schema ──────────────────────────────────────────────────────────────
const flowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(), // node id
  target: z.string(),
  kind: z.enum([
    'agent->endpoint', 'agent->pipeline',
    'agentless->endpoint',
    'prometheus->pipeline', 'prometheus->endpoint',
    'pipeline->stream', 'bulk->stream',
    'stream->stream', // wired routing rule
  ]),
  routingRuleId: z.string().optional(), // only for stream->stream
  isMock: z.boolean().optional(),       // true for any edge whose throughput comes from a mock
  health: flowHealthSchema.optional(),
  throughput: flowThroughputSchema.optional(),
});

// ── Top-level payload ────────────────────────────────────────────────────────
export const flowGraphPayloadSchema = z.object({
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
  meta: z.object({
    generatedAt: z.number().int(),
    fleetAvailable: z.boolean(),
    cloudPipelinesMock: z.literal(true),
    prometheusMock: z.literal(true),
    timeWindow: z.object({ start: z.number().int(), end: z.number().int() }),
  }),
});

export const flowThroughputPayloadSchema = z.object({
  perNode: z.record(z.string(), flowThroughputSchema),
  perNodeFailureRate: z.record(z.string(), flowFailureRateSchema),
  perNodeHealth: z.record(z.string(), flowHealthSchema),
  perEdge: z.record(z.string(), flowThroughputSchema),
  generatedAt: z.number().int(),
});
```

**Fixture**: ship `…/streams/common/flow/fixtures.ts` with one realistic `FlowGraphPayload` (3 agents, 1 agentless integration, 2 prometheus scrapers, 2 cloud pipelines, bulk endpoint, root + 4 child wired streams, 2 classic streams) and one `FlowThroughputPayload`. Frontend workstreams render against these fixtures while server workstreams build the real handlers.

---

## 4. Server-side spec

### 4.1 Plugin wiring (`streams` plugin)

- `kibana.jsonc`: add `"fleet"` to `optionalPlugins`. Re-bootstrap.
- `server/types.ts` — extend `StreamsPluginStartDependencies` with `fleet?: FleetStartContract`.
- `server/routes/types.ts` — extend `RouteHandlerScopedClients` with:
  - `fleetAgentClient?: AgentClient` (per-request scoped)
  - `fleetAgentPolicyService?: AgentPolicyServiceInterface` (singleton, takes `soClient` per call)
  - `cloudPipelinesMock: CloudPipelinesMockClient` (always present; module-singleton)
  - `prometheusMock: PrometheusMockClient` (always present)
- `server/plugin.ts` — instantiate the two mock services in `setup()`, capture in closures, pass into `getScopedClients` factory built in `start()`. Mirror existing pattern for `StreamsService` / `QueryService`.

### 4.2 Mock module: `mock_ingest_sources/`

Path: `x-pack/platform/plugins/shared/streams/server/lib/mock_ingest_sources/`

Tree:
```
mock_ingest_sources/
  index.ts                          // re-exports
  cloud_pipelines/
    types.ts                        // OtlpEndpointConfig, OtlpEndpointHealth, OtlpEndpointThroughput
    storage.ts                      // class CloudPipelinesStore { list/get/create/update/delete }
    metrics.ts                      // generateMetricsForPipeline(id, now, downstreamStreamNames)
    client.ts                       // class CloudPipelinesMockClient implements ICloudPipelinesClient
    seed.ts                         // initial fixtures (2 pipelines)
  prometheus/
    types.ts                        // PrometheusScraper, PrometheusScraperHealth
    storage.ts
    metrics.ts                      // generateMetricsForScraper(id, now)
    client.ts                       // class PrometheusMockClient
    seed.ts                         // 3-4 scraper fixtures
  shared/
    seeded_noise.ts                 // hash(id) → phase; sin wave + jitter; helpers used by both
```

**Interface (lockable for parallel impl):**

```ts
// cloud_pipelines/client.ts
export interface ICloudPipelinesClient {
  list(): Promise<OtlpEndpointConfig[]>;
  get(id: string): Promise<OtlpEndpointConfig | undefined>;
  create(input: Omit<OtlpEndpointConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<OtlpEndpointConfig>;
  update(id: string, patch: Partial<OtlpEndpointConfig>): Promise<OtlpEndpointConfig>;
  delete(id: string): Promise<void>;
  duplicate(id: string): Promise<OtlpEndpointConfig>;
  getMetrics(now: number, streamNames: string[]): Promise<{
    perPipeline: Record<string, OtlpEndpointThroughput>;
    perEdge: Record<string, OtlpEndpointThroughput>; // key = `${pipelineId}->${streamName}`
    health: Record<string, OtlpEndpointHealth>;
  }>;
}

// prometheus/client.ts
export interface IPrometheusMockClient {
  list(): Promise<PrometheusScraper[]>;
  get(id: string): Promise<PrometheusScraper | undefined>;
  create(input: Omit<PrometheusScraper, 'id'>): Promise<PrometheusScraper>;
  update(id: string, patch: Partial<PrometheusScraper>): Promise<PrometheusScraper>;
  delete(id: string): Promise<void>;
  getMetrics(now: number): Promise<{
    perScraper: Record<string, { docsPerSec: number; bytesPerSec: number }>;
    health: Record<string, { status: 'healthy' | 'degraded' | 'down'; message?: string }>;
  }>;
}
```

The interface is what makes future replacement with a real Cloud-side service a pure swap.

**Determinism contract for `metrics.ts`**: `generateMetricsForX(id, t)` where `t = Math.floor(now / 5000)` — values change every 5s, identical between renders within the bucket, identical across processes.

### 4.3 Routes

All under `/internal/streams/_flow/`. `access: 'internal'`, `oasMode: 'never'`. Auth via `STREAMS_API_PRIVILEGES.read` (read paths) / `STREAMS_API_PRIVILEGES.manage` (write).

| Method | Path | Returns | Notes |
|---|---|---|---|
| GET | `/_flow/graph` | `FlowGraphPayload` | The aggregator/BFF — full topology + initial throughput snapshot |
| GET | `/_flow/throughput` | `FlowThroughputPayload` | Live poll target (5s) — small payload, only changing fields |
| GET | `/_flow/cloud_pipelines` | `OtlpEndpointConfig[]` | |
| GET | `/_flow/cloud_pipelines/{id}` | `OtlpEndpointConfig` | |
| POST | `/_flow/cloud_pipelines` | `OtlpEndpointConfig` | |
| PUT | `/_flow/cloud_pipelines/{id}` | `OtlpEndpointConfig` | |
| DELETE | `/_flow/cloud_pipelines/{id}` | `{ acknowledged: true }` | |
| POST | `/_flow/cloud_pipelines/{id}/duplicate` | `OtlpEndpointConfig` | |
| GET | `/_flow/prometheus_scrapers` | `PrometheusScraper[]` | |
| GET | `/_flow/prometheus_scrapers/{id}` | `PrometheusScraper` | |
| POST | `/_flow/prometheus_scrapers` | `PrometheusScraper` | |
| PUT | `/_flow/prometheus_scrapers/{id}` | `PrometheusScraper` | |
| DELETE | `/_flow/prometheus_scrapers/{id}` | `{ acknowledged: true }` | |

### 4.4 BFF handler — `/_flow/graph`

Pseudo-flow (the actual handler is one function, top-down):

```
const start = now - 5*60_000; const end = now;
const [streams, allAgents, agentlessPolicies, pipelines, scrapers,
       streamRates, streamFailures, pipelineMetrics, scraperMetrics] = await Promise.all([
  streamsClient.listStreamsWithDataStreamExistence(),
  fleetAgentClient?.listAgents({ showAgentless: true, showInactive: false, perPage: 1000 })
    ?? { agents: [] },
  fleetAgentPolicyService?.list(soClient, {
    kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.supports_agentless: true`, perPage: 1000,
  }) ?? { items: [] },
  cloudPipelinesMock.list(),
  prometheusMock.list(),
  getStreamRates({ esClient, streams, start, end }),       // new helper, see 4.5
  getFailedDocCountsForStreams({ esClient, start, end }),  // existing
  cloudPipelinesMock.getMetrics(now, streams.map(s => s.name)),
  prometheusMock.getMetrics(now),
]);

return assembleFlowGraphPayload({...});  // pure function, easy to unit-test
```

The `assembleFlowGraphPayload` pure function is the heart of the workstream split: server impl owns its inputs, but the function itself is testable on fixtures and used by the frontend integration test.

### 4.5 New ES helper — `getStreamRates`

Path: `x-pack/platform/plugins/shared/streams/server/lib/streams/flow/get_stream_rates.ts`

For each stream, return `{ name, docsPerSec }` over `[start, end]`. Implementation: single ES `_msearch` over each stream's data stream backing indices; query `range @timestamp` + `size: 0` + `aggs: { c: value_count(@timestamp) }`; divide by window seconds.

(Existing `getDocCountsForStreams` returns totals over a window — close, but we want a clean rate. Either reuse it and divide, or write a slim helper. **Decision: reuse and divide.** Saves one round-trip and one new helper.)

### 4.6 Failure-rate fetch

Reuse `getFailedDocCountsForStreams({ esClient, start, end })` from `…/routes/streams/doc_counts/get_streams_doc_counts.ts`. Divide returned counts by window seconds. Privilege failures yield empty rows — graceful.

---

## 5. Client-side spec (`streams_app` plugin)

### 5.1 Routing & nav

- `public/routes/config.tsx`: add `'/_flow': { element: <RedirectTo path="/_flow/graph" />, … }` no — just a single route `'/_flow'` rendering `<IngestFlowView />`. Sibling of `/_discovery`.
- `managementQueryParams` zod schema: extend with two new optional params used by deep-links from the flow page back into stream management:
  ```ts
  editRoutingRuleId: z.string().optional(),  // pre-open routing-rule editor
  action: z.enum(['addChild']).optional(),   // pre-trigger "add child" affordance
  ```
- Nav entry: in `components/stream_list_view/index.tsx` near the "Significant Events" button (~line 196), add `<EuiButton iconType="visNetwork" onClick={() => router.push('/_flow', { path: {}, query: {} })}>Ingest flow</EuiButton>`.

### 5.2 Component tree

```
public/components/ingest_flow_view/
  index.tsx                          // <IngestFlowView />: page shell, fetch, providers
  flow_canvas.tsx                    // <FlowCanvas payload throughput onSelectNode />: ReactFlowProvider + ReactFlow
  layout.ts                          // applyCompoundLayout — adapted from fleet OTel graph_view
  hooks/
    use_flow_graph.ts                // useStreamsAppFetch wrapper for /_flow/graph
    use_flow_throughput_poll.ts      // 5s setInterval against /_flow/throughput
    use_stream_discover_link.ts      // extracted from streams_list/index.tsx
  nodes/
    agent_node.tsx
    agent_policy_group_node.tsx
    agentless_integration_node.tsx
    prometheus_scraper_node.tsx
    cloud_pipeline_node.tsx
    bulk_endpoint_node.tsx
    wired_stream_node.tsx
    classic_stream_node.tsx
    lane_label_node.tsx              // lightweight pseudo-node for "Fleet Agents" / "Agentless" / "Prometheus" labels
  edges/
    throughput_edge.tsx              // BaseEdge + label = formatRate(docsPerSec); strokeWidth = log10(rate+10)*2
  panels/
    detail_flyout.tsx                // dispatcher by selected node kind
    panel_agent.tsx
    panel_agent_policy.tsx
    panel_agentless.tsx
    panel_prometheus.tsx
    panel_cloud_pipeline.tsx
    panel_bulk_endpoint.tsx
    panel_wired_stream.tsx
    panel_classic_stream.tsx
  flyouts/
    cloud_pipeline_edit_flyout.tsx   // create / edit / duplicate
    prometheus_scraper_edit_flyout.tsx
  badges/
    failure_rate_badge.tsx           // red EuiNotificationBadge; click → useFailureStoreRedirectLink
    health_pill.tsx                  // EuiHealth wrapper
  mock_banner.tsx                    // permanent EuiCallOut "Cloud Pipelines + Prometheus mocked"
  legend.tsx                         // small legend for edge thickness, lanes
```

### 5.3 Internal interface — node renderer contract

Every node component receives the same shape from React Flow:

```ts
// React Flow's <Node> data prop is typed via our discriminated union:
type FlowNodeData = z.infer<typeof flowNodeSchema>;

// Each node component:
type NodeComponent<K extends FlowNodeData['kind']> = React.FC<NodeProps<Extract<FlowNodeData, { kind: K }>>>;
```

`flow_canvas.tsx` exposes a `nodeTypes` map: `{ agent: AgentNode, agentPolicy: AgentPolicyGroupNode, ... }`. Each node component is a self-contained EUI panel — workstreams D1–D8 (one per node type) can be developed independently against the fixture once the contract is locked.

### 5.4 Internal interface — detail flyout dispatcher

```ts
function DetailFlyout({ node, onClose }: { node: FlowNodeData | null; onClose(): void }) {
  if (!node) return null;
  switch (node.kind) {
    case 'agent':                return <PanelAgent node={node} onClose={onClose} />;
    case 'agentPolicy':          return <PanelAgentPolicy node={node} onClose={onClose} />;
    case 'agentlessIntegration': return <PanelAgentless node={node} onClose={onClose} />;
    case 'prometheusScraper':    return <PanelPrometheus node={node} onClose={onClose} />;
    case 'cloudPipeline':        return <PanelCloudPipeline node={node} onClose={onClose} />;
    case 'bulkEndpoint':         return <PanelBulkEndpoint node={node} onClose={onClose} />;
    case 'wiredStream':          return <PanelWiredStream node={node} onClose={onClose} />;
    case 'classicStream':        return <PanelClassicStream node={node} onClose={onClose} />;
  }
}
```

Each panel component has the same prop signature: `{ node, onClose }`. Trivially parallelizable.

### 5.5 Quick-link inventory (per panel)

| Panel | Action button(s) | Implementation |
|---|---|---|
| Agent | "View agent", "View logs" | `application.navigateToApp('fleet', { path: pagePathGetters.agent_details({ agentId })[1] })` |
| Agent policy | "View policy" | `pagePathGetters.policy_details({ policyId })` |
| Agentless | "Edit integration" | `pagePathGetters.integration_policy_edit({ packagePolicyId })` (app id `'integrations'`) |
| Prometheus | "Edit scraper", "Delete" | `PrometheusScraperEditFlyout` |
| Cloud pipeline | "Edit", "Duplicate", "Delete" | `CloudPipelineEditFlyout` (with optional `focusField`) |
| Bulk endpoint | "API keys" | `application.navigateToApp('management', { path: '/security/api_keys' })` |
| Wired stream | "Overview", "Processing", "Routing", "Schema", "Retention", "Attachments", "Add child", "View in Discover", "View failures" | `streamsAppRouter.link('/{key}/management/{tab}', { path: { key, tab }, query: ... })`; "Add child" passes `?action=addChild`; "View failures" uses `useFailureStoreRedirectLink` |
| Classic stream | Same as wired (subset of tabs) + Discover/failures | Same |
| Edge: stream→stream | "Edit routing condition" | navigate to parent's `partitioning` tab with `?editRoutingRuleId=<rule.id>` |
| Edge: pipeline→stream | "Edit pipeline" | `CloudPipelineEditFlyout` with `focusField: 'targetStream'` |
| Edge: agent→endpoint | "Edit policy outputs" | `pagePathGetters.policy_details_settings({ policyId })` |
| Edge: agentless→bulk | "Edit integration" | same as agentless panel |
| Failure-rate badge | (click) | `useFailureStoreRedirectLink({ streamName }).href` |

### 5.6 State + polling

- Topology: `useFlowGraph()` → `useStreamsAppFetch('/internal/streams/_flow/graph', { withRefresh: true })`. Refetches on global timefilter refresh + after any cloud-pipeline / prometheus mutation (`.refresh()`).
- Throughput: `useFlowThroughputPoll(intervalMs = 5000, paused: boolean)`. Internal `setInterval` + `AbortController`. Output is a `Map<nodeId, FlowThroughput>` and `Map<edgeId, FlowThroughput>` merged into React Flow `nodes` / `edges` via `setNodes((prev) => prev.map(...))`. Layout is **not** recomputed on poll.
- Pause toggle (`EuiSwitch` in header) flips the `paused` flag.

### 5.7 Layout

`layout.ts` — port of `fleet/.../graph_view/layout.ts`:
1. Group nodes by `column` (3 columns) and within `shippers` further by `lane` (3 lanes).
2. Run a Dagre instance per column with `rankdir: 'LR'`, but constrain x to a fixed bucket per column.
3. Within `shippers`, lanes get fixed y-bands; agents grouped by `parentId` (policy group) get tighter clustering.
4. Edges get LR routing.
5. Output `{ nodes: Node[], edges: Edge[] }` with explicit `position`.

Re-run only on payload `nodes.length` / `edges.length` change, not on throughput poll.

---

## 6. Cross-cutting concerns

### 6.1 i18n
Every visible string wrapped in `i18n.translate('xpack.streams.ingestFlow.<key>', { defaultMessage })`. POC scope: only the new strings — don't touch existing translations.

### 6.2 Privileges
- Page mount: gate on `streamsPrivileges.ui.show` (existing).
- Failure-rate badge: omit if `getFailedDocCountsForStreams` returned no row for the stream (privilege-driven empty result is indistinguishable from "no failures" — fine for POC).
- Cloud pipeline + Prometheus CRUD: gated on `STREAMS_API_PRIVILEGES.manage` server-side; "Edit" / "Delete" buttons disabled client-side based on `streamsPrivileges.api.manage`.
- Fleet calls: catch `FleetUnauthorizedError`, return empty arrays + `meta.fleetAvailable = false`. Banner shows "Fleet not available" if so.

### 6.3 Spaces awareness
`fleetAgentPolicyService.list` and `agentService.listAgents` are space-aware via the SO client and `getSpaceAwarenessFilterForAgents`. Pass `spaceId` from request context.

### 6.4 Error handling
Per-source resilience: each `Promise.all` slot wrapped in `.catch(() => fallback)`. The graph still renders if Fleet errors out — banner just notes degraded state via `meta`.

### 6.5 Telemetry
Out of scope for POC. Add `usageCollection` hooks later.

### 6.6 Testing
- Server: jest unit tests for `assembleFlowGraphPayload(fixtures)` — pure function, exhaustive coverage. Jest unit tests for both mock metrics generators (determinism + bounds).
- Client: jest snapshot for one realistic payload → rendered nodes + edges. One Scout UI test: page loads, click agent node opens panel.

---

## 7. Workstream split (for parallel execution)

Goal: 6 engineers × ~3 days each in parallel after day-1 contract lock.

### Day 1 (single-threaded): **CONTRACT** workstream
**Owner**: 1 eng. **Output**: PR landing
- `streams/common/flow/types.ts` + `fixtures.ts` (zod schemas + realistic fixture)
- Empty `_flow/graph` + `_flow/throughput` routes returning the fixture
- Empty `_flow/cloud_pipelines/*` + `_flow/prometheus_scrapers/*` routes returning seeded fixtures
- `streams_app` route registration + nav button + `<IngestFlowView />` shell that fetches `/internal/streams/_flow/graph` and dumps the JSON in a `<pre>` block
- `routes/config.tsx` query param additions (`editRoutingRuleId`, `action`)

After this PR merges, all six workstreams below run in parallel, each against the locked types and the fixture-served endpoints.

### Workstream A — **SERVER REAL DATA**
**Owner**: 1 eng (server-leaning). **PRs**: 2.
- A1: Fleet plumbing (`optionalPlugins`, types, scoped clients, agent + agentless query, `assembleFlowGraphPayload` real impl wired in)
- A2: Stream rates + failure rates wired into `_flow/graph` and `_flow/throughput`. Replace fixture data path-by-path.
- **Boundary**: returns `FlowGraphPayload` exactly matching the fixture's shape. Frontend never sees this work.

### Workstream B — **MOCK MODULES**
**Owner**: 1 eng. **PRs**: 2.
- B1: `mock_ingest_sources/cloud_pipelines/` — storage, metrics generator, client, routes wired up
- B2: `mock_ingest_sources/prometheus/` — same pattern
- **Boundary**: `ICloudPipelinesClient` + `IPrometheusMockClient` interfaces. Workstream A consumes them.

### Workstream C — **CANVAS + LAYOUT**
**Owner**: 1 eng (frontend, graph-leaning). **PRs**: 1.
- `flow_canvas.tsx` + `layout.ts` (port from Fleet OTel) + `throughput_edge.tsx` + `lane_label_node.tsx` + legend
- Renders the fixture payload in a recognizably correct three-column, three-lane layout
- **Boundary**: receives `FlowGraphPayload` + `FlowThroughputPayload` props; emits `onSelectNode(nodeId)` / `onSelectEdge(edgeId)`. Renders placeholder boxes for node kinds (until Workstream D lands).

### Workstream D — **NODE + PANEL COMPONENTS**
**Owner**: 1–2 eng (D split into D1 nodes + D2 panels if desired). **PRs**: 1–2.
- All 8 node components + 8 panel components against the fixture
- `failure_rate_badge.tsx`, `health_pill.tsx`
- Each node + panel pair is independent — internally further parallelizable
- **Boundary**: node component API = React Flow `NodeProps<FlowNodeData>`; panel component API = `{ node, onClose }`.

### Workstream E — **DEEP-LINK PLUMBING**
**Owner**: 1 eng. **PRs**: 1.
- `useStreamDiscoverLink` extraction from `streams_list/index.tsx`
- `editRoutingRuleId` and `action: 'addChild'` consumed in `stream_detail_routing/index.tsx` (mount effect dispatching state-machine events)
- Verify all `pagePathGetters.*` lookups resolve correctly and exist (smoke-test by clicking through each in dev)
- **Boundary**: a small `links.ts` file exporting `getQuickLinks(node): QuickLink[]` consumed by panel components.

### Workstream F — **EDIT FLYOUTS**
**Owner**: 1 eng. **PRs**: 2.
- F1: `CloudPipelineEditFlyout` (create/edit/duplicate, with optional `focusField` prop)
- F2: `PrometheusScraperEditFlyout` (create/edit)
- Wired to repository client mutations + `useFlowGraph().refresh()` on success
- **Boundary**: `<CloudPipelineEditFlyout pipelineId={...} mode="edit"|"create" focusField={...} onClose={...} />` (and the analogous Prometheus one). Workstream D imports them by path.

---

### Dependency graph between workstreams

```
        ┌─────────────┐
        │  CONTRACT   │ (day 1, single-threaded)
        └──────┬──────┘
               │
   ┌──────┬────┴────┬──────┬──────┬──────┐
   ▼      ▼         ▼      ▼      ▼      ▼
   A      B         C      D      E      F
              (B-client used by A)   (E-links consumed by D)
                          (D imports F flyouts in panels)
```

A consumes B's client interfaces (so B should land first — about 1 day ahead of A2). Otherwise no cross-blocking.

### Definition of Done per workstream

| WS | DoD |
|---|---|
| CONTRACT | Page loads, dumps fixture JSON, nav button works, all routes registered |
| A | Real Fleet + streams + failure rates flowing end-to-end; jest covers `assembleFlowGraphPayload` |
| B | Mock CRUD reachable via `streamsRepositoryClient.fetch`, metrics deterministic in jest |
| C | Fixture renders as recognizable graph; pause toggle works; legend visible |
| D | Each node + panel renders fixture data correctly with EUI styling |
| E | All quick-link buttons in panels navigate to existing surfaces; routing-rule edit deep-link opens the right rule |
| F | Both flyouts perform CRUD against mock; refresh causes graph to update |

### Integration day (after all merge)
Half-day. Wire A's real payload through C's canvas, D's components, F's flyouts. Smoke test against a stateful Kibana with at least one Fleet agent + a stream tree. Fix layout / sizing bugs. Land the polish (mock banner, lane labels, legend tweaks) in a final PR.

---

## 8. Open questions tracked

1. Failure-rate window — fixed 5m vs. global timefilter? **Default**: 5m; revisit.
2. `routingRule.edit` deep-link — pass rule id or destination stream name? **Default**: destination stream name; resolve at mount.
3. Prometheus icon — no `logoPrometheus` in EUI; use `logoMetrics` or inline SVG.
4. Wired stream "View dashboards" tab doesn't exist; we route to `attachments`. Confirm with PM.
5. Spaces — POC tested only in default space. Follow-up to verify.
6. Live-poll rate — 5s is fine for demo; tune later if ES load matters.

---

## 9. Out of scope (for the POC)

- Persistence of mock entities across Kibana restarts
- Real Cloud Pipelines control plane integration
- Real Prometheus ingestion path
- Telemetry / usage collection
- Audit logging for mock CRUD
- RBAC fine-grained per-pipeline / per-scraper
- Agent-to-pipeline edges driven by real policy output configs (we approximate with "all agents → bulk endpoint")
- Migration / hardening of the `_flow/*` routes from `internal` to `public`
