# Entity Store

Central place for Entities management and logs extraction.

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

The Entity Store keeps an in-memory **entity definition registry**: the set of entity types (their fields, identity and source index patterns) known to this Kibana instance. Other plugins can add their own definitions through the setup contract. The registry is not yet read by the store's own extraction code. Registering a definition has no side effects in the entity store: it creates no templates, mappings, engines or tasks, and the store's own routes keep validating against the four types it owns.

### Registering a definition

Call `registerEntityDefinition` during your plugin's `setup` phase:

```ts
public setup(core: CoreSetup, { entityStore }: MyPluginSetupDeps) {
  const result = entityStore.registerEntityDefinition({
    type: 'k8s.pod',
    name: 'Kubernetes pod',
    identityField: { singleField: 'kubernetes.pod.uid' },
    indexPatterns: ['logs-*', 'metrics-*'],
    fields: [],
    managedBy: { kind: 'plugin', id: 'myPlugin' },
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
