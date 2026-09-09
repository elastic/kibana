# @kbn/endpoint-common

Shared endpoint vocabulary: the `EndpointAuthz` privilege model, response action
command names, agent types, the command × action-type × agent-type support map,
route path constants, and per-action request schemas.

Owned by `@elastic/security-defend-workflows`.

## Why this package exists

This data originated in `security_solution/common/`. That plugin is
`group: "security"`, `visibility: "private"`, so nothing outside the security group
can import from it. Agent Builder (`group: "platform"`) and Workflows
(`@kbn/workflows`, `group: "platform"`) both need this data, and
`@kbn/imports/no_group_crossing_imports` forbids a platform module from depending on
a solutions module.

The package is therefore `group: "platform"`, which makes it importable from platform
and solutions modules alike. `group` governs dependency direction; `owner` governs
review. Ownership stays with Defend, consistent with other Defend-owned platform
modules such as `x-pack/platform/plugins/shared/osquery`.

It sits under `x-pack/` rather than `src/platform/` so the Elastic License 2.0 header
is preserved — `src/` is triple-licensed (ELv2 / AGPL-3.0-only / SSPL).

## Why `endpoint-common` and not `response-actions-common`

`EndpointAuthz` carries 49 privilege keys covering trusted applications, blocklist,
event filters, YARA signatures, artifacts, Fleet access and admin data. Response
actions reference nine of them. The interface moves here whole rather than being
split, so the package name describes the shared endpoint vocabulary it actually
holds rather than the first consumer that needed it.

## Single source of truth

Two copies of these schemas would drift, and a drifted schema is a silent failure at
action execution time. Each original file in `security_solution/common/` becomes a
re-export from this package, so there is exactly one definition of each symbol and
existing consumers keep their import paths.

Re-exports are **explicit and named**, never `export *` — in this package's entry point
and in the plugin's proxy files alike. Several moved symbols are also re-exported by
index files inside `security_solution` (for example `common/endpoint/types/index.ts` and
`common/endpoint/service/authz/index.ts`). A wildcard re-export would therefore pull the
whole package surface through several of those index files at once, and the duplicate
exports would collide.

## Consumers

| Module | group |
| --- | --- |
| `securitySolution` plugin | security |
| `@kbn/pnd-common` | security |
| `agentBuilder` plugin | platform |
| `@kbn/workflows` | platform |
