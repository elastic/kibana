# Inbox plugin

The **Inbox plugin** provides the human-in-the-loop (HITL) control center for agents and
tasks that have paused execution and are waiting for a human to approve, reject, or otherwise
weigh in. It exposes a list of pending "inbox actions" that other plugins (for example,
Security Solution, Evals, and Attack Discovery) can feed into, and a dedicated page where
analysts can review and action them.

Inbox is registered as a standalone Kibana app (`/app/inbox`). Solutions that want to surface
it in their own navigation can reference the `inbox` deep link id - see the Security Solution
wiring in `x-pack/solutions/security/plugins/security_solution_{ess,serverless}/public/navigation`.

## Architecture

The feature spans two modules:

- `@kbn/inbox-common` - shared schemas (OpenAPI-generated Zod types), URL constants, and the
  feature id. Used by both the server routes and the public react-query hooks as the single
  source of truth for the HTTP contract. Server routes adapt these Zod schemas to Kibana's
  route validation via `buildRouteValidationWithZod` from `@kbn/zod-helpers/v4`.
- `inbox` plugin (this package) - server routes that read inbox actions (currently stub data),
  plus a React UI for browsing them.

```
  @kbn/inbox-common  (shared-common)
  -------------------
  - OpenAPI YAML -> generated Zod in impl/schemas/**/*.gen.ts
  - URL + API version + feature id constants
            |
            v
  inbox plugin
  -------------------
  - server: versioned /internal/inbox/* routes, feature registration
  - public: /app/inbox page, react-query hooks against the shared contract
```

## Enabling the plugin

The plugin is **disabled by default**. To enable it locally, add the following to your
`kibana.dev.yml`:

```yaml
xpack.inbox.enabled: true
```

When disabled:

- the server plugin returns early from `setup()`; no routes are registered and no Kibana
  feature is created, so the `inbox` privilege is not available
- the public plugin skips `application.register`, so `/app/inbox` resolves to the default
  not-found page and any nav links pointing at `inbox` are gracefully hidden by the chrome

## API routes

All routes are internal, versioned (`v1`), and require the `inbox` privilege.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/internal/inbox/actions` | List inbox actions (paginated, filterable by `status` and `source_app`) |

The handler currently returns a small set of stub actions from
`server/routes/actions/stub_actions.ts`. Swap that for a real storage reader (ES index or
saved objects) once the HITL action schema stabilizes - the route shape itself should not
need to change.

## Regenerating OpenAPI schemas

The Zod types in `@kbn/inbox-common` are generated from the OpenAPI `.schema.yaml` files in
`impl/schemas`:

```bash
cd x-pack/platform/packages/shared/kbn-inbox-common
yarn openapi:generate
```

After regenerating, run eslint over the generated files to clean up any unused imports:

```bash
node scripts/eslint --fix x-pack/platform/packages/shared/kbn-inbox-common/impl/schemas/**/*.gen.ts
```

## RBAC

The plugin registers a single Kibana feature with id `inbox`. Both `all` and `read` grant the
`inbox` API privilege and the `show` UI capability. When more granular actions land (for
example, approve, reject, or snooze), add sub-privileges to this feature rather than
introducing a new one so existing grants continue to work.

## Running tests

```bash
# Plugin unit tests
yarn test:jest --config=x-pack/platform/plugins/shared/inbox/jest.config.js

# Shared package tests
yarn test:jest --config=x-pack/platform/packages/shared/kbn-inbox-common/jest.config.js
```
