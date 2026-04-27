# Osquery Scout tests

Playwright UI and API tests under `test/scout_osquery/` run against Kibana with the **osquery** `serverConfigSet` (see
`src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/osquery/`).

## Authentication (stateful classic)

`classic.stateful.config.ts` orders **`basic`** authentication before **SAML** so a developer hitting
`http://localhost:5620` (or the Scout default URL) does not get stuck in a SAML redirect loop. SAML remains available as
the second provider. UI specs use `loginWithCustomRole` / `loginAsOsqueryPowerUser()` rather than hand-typing
credentials in each test.

## Fleet Server and Docker agents (`global.setup.ts`)

For **local** (and other Docker-capable) targets, `ui/parallel_tests/global.setup.ts` may:

- Call Fleet setup APIs
- Start **Fleet Server** and **Elastic Agent** containers on the `elastic` Docker network when Docker is installed
- Skip container provisioning when Docker is **not** available (log explains the skip)

This is **not** the same model as every Oblt (e.g. APM) Scout suite: some suites rely only on APIs and pre-provisioned
stacks.

### Cloud / MKI Playwright tags

Specs tagged with `OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS` (see `common/scout_parallel_ui_tags.ts`) include both **local
** and **`@cloud-*`** Playwright tags from `@kbn/scout`. A run selected with a cloud tag uses the **target environment’s
** Kibana/Fleet/agents; it does **not** execute `docker run` on the CI worker from this setup file. Treat Docker
orchestration here as **local stack** infrastructure.
