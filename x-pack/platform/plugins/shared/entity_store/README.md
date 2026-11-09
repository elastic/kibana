# Entity Store

Central place for Entities management and logs extraction.

## Logs extraction

Each entity type has a Task Manager task that reads source logs with ES|QL and upserts entities into `.entities.v2.latest.{namespace}`.

| Task type | Runs for | Default cadence |
|---|---|---|
| `entity_store:v2:extract_entity_task:{type}` | every type | user and host `1m`, service `10m`, generic `30m` |
| `entity_store:v2:extract_entity_non_priority_task:user` | user; scheduled always, does work only with the dual-process flag on | same as user, `1m` |

### Dual-process extraction

With the Cloud feature flag `entityStore.dualProcess.enabled` (`FF_DUAL_PROCESS_ENABLED`) on, user extraction is split in two processes by a document-level gate (`priorityExtractionGate` in `common/domain/definitions/user.ts`):

- Priority reads only `event.kind: asset` logs. It defers on the volume cap and never samples.
- Non-priority reads every other log. It drops on the volume cap and uses adaptive ES|QL `SAMPLE` above the volume budget.

Each process keeps its own cursor, status and error on the engine descriptor (`logExtractionState` / `status` / `error` and `nonPriorityLogExtractionState` / `nonPriorityStatus` / `nonPriorityError`). With the flag off, only the first task does work and extraction runs as `single`, which is the same as before the split.

### Configuration layers

`getMergedConfig` (`server/domain/config/merge_config.ts`) builds the config for one type and process. Later layers win:

1. Code defaults (`LATEST_LOG_EXTRACTION_DEFAULTS`)
2. Per-type code defaults (`DEFAULT_CONFIG_BY_TYPE`)
3. Per-process defaults (`DEFAULT_CONFIG_BY_MODE`)
4. Store-wide overrides, set with `logExtraction` on public `install` and `update`
5. Per-type overrides (`logExtractionConfig`), set with `logExtraction` on internal `PUT /internal/security/entity_store/{entityType}`
6. Non-priority overrides (`nonPriorityLogExtractionConfig`, incl. `samplingRate`), set with `nonPriorityOverride` on the same route

`null` clears a field, so it falls back to the layer below. Arrays such as `additionalIndexPatterns` replace the lower layer, they do not merge. For non-priority, layers 4 and 5 cannot set the volume fields (`NON_PRIORITY_EXCLUSIVE_FIELDS`); only layer 6 can.

Pagination, sampling, the volume cap and crash recovery are described in [server/domain/logs_extraction/PAGINATION.md](server/domain/logs_extraction/PAGINATION.md).

## Entity AI Summary — index privileges

The Entity AI Summary is persisted to the entity **metadata** datastream
(`.entities.v2.metadata.{namespace}`), not to the entity latest index.
Its access-control model separates generation from display:

- **Generation** is gated only on feature-level permissions — the Security Solution
  Kibana feature plus its `entity-analytics` sub-privilege — and an **Enterprise**
  license. The persisted document is written with the Kibana **internal** user
  (`asInternalUser`), so a user does **not** need their own write privilege on the
  metadata index to generate and persist a summary.
- **Display** is gated on the user's **own** read privilege on
  `.entities.v2.metadata.*`. With read access the persisted summary is shown
  (including the original `generated_by` / `generated_at`, so a second user sees the
  first user's generation); without it the flyout gracefully falls back to on-demand
  generation and nothing is persisted for that view.

### Serverless

Serverless project roles already grant the required access (see
`src/platform/packages/shared/kbn-es/src/serverless_resources/project_roles/security/roles.yml`):
`viewer` / `t1_analyst` get `read` on `.entities.v2.metadata.*`, while
`editor` / `t2_analyst` / `detections_admin` get `read` + `write`.

### Self-managed / ECH (stateful)

To **see** a persisted AI summary on self-managed or Elastic Cloud Hosted deployments,
a user needs, in addition to the Security Solution Kibana feature privileges:

- `read` on the entity metadata indices `.entities.v2.metadata.*`.

No metadata **write** privilege is required for any user, because persistence always
goes through the Kibana internal user. Users lacking metadata read still get on-demand
generation (graceful degradation).

> Note: Elasticsearch built-in roles (e.g. `detections_admin`) are defined in the
> Elasticsearch repository, not in this fork. Whether they already include
> `.entities.v2.metadata.*` read is a verification item against a live cluster,
> not something enforced here. Kibana test fixtures cover the model via custom roles
> (see `security_solution/test/scout/entity_analytics/api/tests/ai_summary`).

## Entity Maintainers Framework

The Entity Store plugin exposes an **Entity Maintainers Framework** so that other plugins can register recurring tasks that run in the context of the entity store. Registration is part of the plugin setup contract: consumers call `registerEntityMaintainer` during their plugin’s `setup` phase and supply a configuration object.

### Setup contract and registration config

From the setup contract:

```ts
interface EntityStoreSetupContract {
  registerEntityMaintainer: RegisterEntityMaintainer;
}
```

`RegisterEntityMaintainer` accepts a `RegisterEntityMaintainerConfig`:

```ts
interface RegisterEntityMaintainerConfig {
  id: string;
  description?: string;
  interval: string;
  initialState: EntityMaintainerState;
  run: EntityMaintainerTaskMethod;
  setup?: EntityMaintainerTaskMethod;
}
```

- **id** - Unique identifier for the maintainer (used for task type and scheduling).
- **interval** - Cron-like interval at which the task runs (e.g. `5m`, `1h`).
- **initialState** - Initial state object for the maintainer, used on the first run before any `setup` or `run` has executed.
- **run** - Required. Called on every run (including the first). Must return the current state it manages.
- **setup** - Optional. If provided, it runs once before the first `run`. Useful for one-time initialization. 

### Scheduling and namespaces

The framework schedules all registered maintainers when the Entity Store is installed for a given space. 
The framework is **namespace aware**: each Kibana space gets its own task instance per maintainer (e.g. one task per `id` per namespace). Registration is global, scheduling is per namespace at install time.

### Run and setup behavior

- **run** is invoked on every execution at the configured interval. It receives a context (see below) and must return the **current state** it manages. That state is persisted and passed back in the context on the next run.
- **setup** is optional. When supplied, it runs a single time before the first **run**. It receives the same context shape and also returns state, that state becomes the initial state for the first **run**. If setup performs heavy work, the first iteration can be noticeably longer than subsequent ones.

Both methods must return the state object they manage so the framework can store it and expose it in the context for the next iteration.

### Callback context

Both `run` and `setup` receive a single context argument with:

- **status** - Object containing:
  - **metadata** - Maintained by the framework: `namespace`, `runs` (execution count), `lastSuccessTimestamp`, `lastErrorTimestamp`.
  - **state** - The state returned by the previous `run` (or by `setup` on the first run, or `initialState` before any execution).
- **abortController** - For cooperative cancellation if needed.
- **logger** - Scoped logger for the task.
- **fakeRequest** - Request-scoped utilities for the task execution environment.
- **esClient** - An Elasticsearch client scoped to the current context, using the permissions of the user who triggered the Entity Store plugin installation process.

Consumers implement their maintenance logic in `run` (and optionally in `setup`) using this context and return the updated state so the framework can keep it for the next run.

## Entity definition registry

The Entity Store keeps an in-memory **entity definition registry**: the set of entity types (their identity and, optionally, extraction config) known to this Kibana instance. Other plugins can add their own definitions through the setup contract. The registry is not yet read by the store's own extraction code. Registering a definition has no side effects in the entity store: it creates no templates, mappings, engines or tasks, and the store's own routes keep validating against the four types it owns.

### Registering a definition

Call `registerEntityDefinition` during your plugin's `setup` phase:

```ts
public setup(core: CoreSetup, { entityStore }: MyPluginSetupDeps) {
  const result = entityStore.registerEntityDefinition({
    type: 'k8s.pod',
    name: 'Kubernetes pod',
    description: 'A Kubernetes pod. Identified by kubernetes.pod.uid.',
    identityField: { singleField: 'kubernetes.pod.uid' },
    managedBy: { kind: 'plugin', id: 'myPlugin' },
    // Optional; see "Definition shape".
    dynamic: {
      sources: [
        {
          indexPattern: 'metrics-kubernetes.state_pod-*',
          attributes: [{ name: 'namespace', field: 'kubernetes.namespace' }],
        },
      ],
    },
  });
  if (!result.ok) {
    // result.reason explains the rejection; it has already been logged.
  }
}
```

- Every definition must carry `managedBy: { kind: 'plugin', id: <your plugin id> }`. Other kinds are rejected at setup.
- Code registration is only possible during setup. It closes when the Entity Store starts, so later calls are logged and ignored. Definitions managed by integrations or users will arrive through storage later, not through this call.
- A rejected definition (invalid schema, missing or non-plugin `managedBy`, invalid or duplicate type name) is logged and skipped. Registration never throws, and Kibana keeps starting.
- Registered definitions are deep-frozen in place (the registry holds the object you pass, not a copy), so neither the registry nor the caller can modify them afterwards. Unknown keys, including `id`, are rejected.

### Definition shape

A definition is an identity core plus two optional blocks, `extraction` and `dynamic`. A definition may carry either, both or neither:

- Core: `type`, `name`, `description`, `managedBy` and `identityField`. This is sufficient for the id compiler, so a definition with only the core is valid; when `extraction` is present, document/search paths also replay its field evaluations, overrides and post-aggregation gate. `name` is the type's display name, shown wherever the type is listed. `description` is optional free text on what the entity is and how it is identified.
- `extraction`: the config the store's extraction engine, templates and CRUD API read (`fields`, `fieldEvaluations`, `postAggFilter`, `whenConditionTrueSetFieldsPreAgg`, `whenConditionTrueSetFieldsAfterStats`, `entityTypeFallback`, `creatableFromSingleDocument`, `priorityExtractionGate`, `nonPrioritySampling`). Its presence does not make the store extract the type: the store only materialises its four built-ins.
- `dynamic`: what the inventory reads to generate ES|QL over raw telemetry for its list, count and detail views. See "The `dynamic` block" below.
- There is no `indexPatterns` key. Source indices for extraction are API configuration (global state and per-engine overrides), not part of a definition.
- Unknown keys are rejected, at the top level, inside each block and inside `identityField`. An identity is exactly one of its two variants (`singleField`, or `euidRanking` with `documentsFilter`); keys of both in one identity are rejected rather than stripped, because the registry stores the object as passed and the EUID helpers pick the variant by key presence.

`@kbn/entity-store/common` exports the types `EntityDefinitionWithoutId` (a definition as registered), `ExtractionBlock` and `ExtractedEntityDefinition` (a definition with the block required), `DynamicBlock`, and the block zod schemas `extractionBlockSchema` and `dynamicBlockSchema`. `EntityDefinitionOfAnyType` remains as a deprecated alias of `EntityDefinitionWithoutId`.

#### The `dynamic` block

The schema and rules live in `common/domain/definitions/dynamic/`, owned by `@elastic/obs-signals-metrics-team`. Authors declare what to read, never how: engine choice, grouping, null handling and query shape belong to the inventory's generator.

```ts
dynamic: {
  sources: [
    {
      indexPattern: 'metrics-kubernetes.state_pod-*',
      filter: 'metricset.name == "state_pod"',
      attributes: [
        { name: 'namespace', field: 'kubernetes.namespace' },
        { name: 'phase', field: 'kubernetes.pod.status.phase', valueLabels: { Running: 'running' } },
      ],
    },
  ],
},
```

- Sources: 1 to 16. A source is one index pattern (no commas or whitespace, at most 256 characters); several patterns are several sources. The same pattern may appear on several sources with different filters.
- `filter`: optional opaque ES|QL boolean expression narrowing the source to this type's documents, at most 2000 characters. It is validated for length only; where it goes in the query is the generator's job.
- Attributes: at most 32 per source. `name` is a field path such as `host.arch` or `os.type`, under the same rule as `field` but at most 64 characters, so a column can carry the OpenTelemetry semantic convention name while each source reads its own field. It is the output column and the merge key across sources, and is unique within a source. `field` is a literal field path (dot-separated segments of letters, digits, `_`, `@` and `-`; no wildcards, expressions, quoting or whitespace; at most 512 characters).
- `valueLabels`: optional map from raw values (stringified) to canonical labels, at most 64 entries, keys and labels 1 to 256 characters. Unmapped values pass through.
- Unknown keys are rejected on the block, each source and each attribute. Bounds are denial-of-service limits for HTTP input, not design limits.

Two whole-definition rules apply only when `dynamic` is present, at both `entitySchema` and registration:

- Servable identity: `identityField` is a single literal field, or one unconditional ranking branch of literal fields and separators whose `documentsFilter` is exactly the derived presence filter, with no field evaluations, no `skipTypePrepend` and at most eight distinct fields. The built-in `host` identity fits; `user` does not.
- No attribute `field` may be an identity field.

### Type names

- Lowercase letters, digits and the separators `.`, `_` and `-`, starting with a letter (`ENTITY_DEFINITION_TYPE_PATTERN`). Separators cannot lead, trail or repeat. Examples: `k8s.pod`, `aws_s3-bucket`.
- At most 64 characters.
- Must be unique. Uniqueness is the only name protection; there are no reserved names. The built-ins (`user`, `host`, `service`, `generic`) are registered by the Entity Store during its own setup, before dependent plugins can register, so those names are already taken.

### Managed by

Every registered definition has a `managedBy` field saying who manages it:

- `{ kind: 'plugin', id }`: a Kibana plugin registering in code at setup; `id` is its plugin id.
- `{ kind: 'integration', package }`: installed by a Fleet integration package.
- `{ kind: 'user', id? }`: created through the API or UI; `id` is the Kibana user profile uid when known.

Only `plugin` can be registered today. The four built-ins are managed by the `entityStore` plugin (`{ kind: 'plugin', id: 'entityStore' }`). `managedBy` is returned on every definition read from the registry, so readers can tell who manages it.

### Compiling entity ids for a registered definition

Every function of the `euid` helper (`@kbn/entity-store/common/euid_helpers`) outside `experimental` takes a definition as its first argument, so it works for any registered type. `getBuiltInEntityDefinition`, exported beside `euid`, resolves one of the Entity Store's four built-ins by type name. A plugin that registered `k8s.pod` reads the definition back and passes it in:

```ts
const definitions = entityStore.getEntityDefinitionsClientForSpace(spaceId);
const definition = await definitions.get('k8s.pod');
if (!definition) {
  return; // not registered in this Kibana
}
const esql = euid.esql.getEuidEvaluation(definition, 'entity.id');
```

### Reading definitions

The start contract exposes two ways to get an `EntityDefinitionsClient` (`get(type)` and `list()`, both async):

- `getEntityDefinitionsClient(request)` for request-scoped work. The space is derived from the request.
- `getEntityDefinitionsClientForSpace(spaceId)` for background work without a request.

`list()` returns definitions in registration order. The built-ins (`user`, `host`, `service`, `generic`) come first because the Entity Store registers them during its own setup.

Reading definitions requires no Kibana privilege today, because every definition is plugin code. Authorisation will apply once definitions can be stored and managed outside plugin code; the request parameter exists so that can be added without changing callers.
