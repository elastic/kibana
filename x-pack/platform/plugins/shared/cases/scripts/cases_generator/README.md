# Cases Generator

Seeds a running Kibana with auto-generated cases (and optional comments, alert/event attachments, templates, and analytics indices) for local testing and demos.

Run it from the Kibana repo root:

```bash
node x-pack/platform/plugins/shared/cases/scripts/generate_cases.js [options]
```

All generated cases are tagged `auto-generated` (override with `--cleanupTag`) so they can be wiped later via `--cleanup`.

## Quick start

```bash
# 10 cases in the default space, no attachments
node x-pack/platform/plugins/shared/cases/scripts/generate_cases.js

# Walk through every option interactively
node x-pack/platform/plugins/shared/cases/scripts/generate_cases.js -i

# Preview without writing anything
node x-pack/platform/plugins/shared/cases/scripts/generate_cases.js --dryRun -c 50

# Tear down everything tagged "auto-generated" in every Kibana space
node x-pack/platform/plugins/shared/cases/scripts/generate_cases.js --cleanup

# Or scope cleanup to specific spaces
node x-pack/platform/plugins/shared/cases/scripts/generate_cases.js \
  --cleanup --cleanupSpaces "default,analytics-1"
```

## Common recipes

```bash
# 25 security cases, each with 2 comments + 5 alerts indexed into ES
node x-pack/platform/plugins/shared/cases/scripts/generate_cases.js \
  -c 25 -m 2 -a 5 -o securitySolution

# Mixed-owner load with a weighted distribution
node x-pack/platform/plugins/shared/cases/scripts/generate_cases.js \
  -c 200 --ownerDistribution "securitySolution:60,observability:30,cases:10"

# Spread 50 cases across 3 spaces and turn on analytics indices in each
node x-pack/platform/plugins/shared/cases/scripts/generate_cases.js \
  -c 50 --numSpaces 3 --spaceNamePattern "analytics-{i}" \
  --analyticsOwners securitySolution,observability,cases

# Create 1 rich kitchen-sink template (display rules, validation, compound
# conditions; see kitchen_sink_template.ts for the YAML) and apply it to ~50%
# of generated cases
node x-pack/platform/plugins/shared/cases/scripts/generate_cases.js \
  -c 20 -t 1 --templateOwners securitySolution

# Create 3 synthesized templates with explicit field controls and apply them
# to 100% of cases (opts out of the kitchen-sink default)
node x-pack/platform/plugins/shared/cases/scripts/generate_cases.js \
  -c 20 -t 3 --templateOwners securitySolution \
  --templateFieldTypes "text,number,date" --templateUsagePercent 100

# Exercise the legacy typed-customFields code path: register the script's
# customFields on the configure SO for every owner, and have every generated
# case POST matching {key, type, value} entries
node x-pack/platform/plugins/shared/cases/scripts/generate_cases.js \
  -c 20 --legacyCustomFields

# Combine legacy customFields with legacy templates so the configure SO also
# carries 3 legacy templates (visible as "Create from template" in the UI)
node x-pack/platform/plugins/shared/cases/scripts/generate_cases.js \
  -c 20 --legacyCustomFields --legacyTemplates

# Reproducible run — same seed produces the same plan/data
node x-pack/platform/plugins/shared/cases/scripts/generate_cases.js -c 30 --seed demo-1
```

## Options

| Flag | Default | Notes |
| --- | --- | --- |
| `-i, --interactive` | `false` | Step-by-step prompts |
| `-k, --kibana` | `http://127.0.0.1:5601` | Kibana URL |
| `-n, --node` | `http://elastic:changeme@127.0.0.1:9200` | Elasticsearch URL |
| `-u, --username` / `-p, --password` | `elastic` / `changeme` | Basic auth |
| `--apiKey` | `''` | API key auth (required for serverless) |
| `--ssl` | `false` | Use HTTPS |
| `-c, --count` | `10` | Cases per space |
| `-m, --comments` | `0` | User comments per case |
| `-a, --alerts` | `0` | Alert attachments per case (indexed into ES) |
| `-e, --events` | `0` | Event attachments per case (skipped for `observability` owner) |
| `-o, --owners` | all three | `securitySolution`, `observability`, `cases` |
| `--ownerDistribution` | `''` | Weighted picks, e.g. `securitySolution:60,cases:40` |
| `-s, --space` | `''` (default) | Single target space |
| `--numSpaces` | `0` | Create N spaces and generate into each |
| `--spaceNamePattern` | `space-{i}` | `{i}` is replaced with 1-based index |
| `--analyticsOwners` | unset | Enable analytics indices for these owners in every target space |
| `-t, --templates` | `0` | Auto-generate N templates per owner per target space (max 10) |
| `--templateOwners` | `--owners` | Owners to create templates under |
| `--templateFieldTypes` | unset (= kitchen-sink template when `--templates > 0`) | Comma-separated controls that opt **out** of the kitchen-sink default and into a synthesized template. Valid: `text`, `number`, `textarea`, `date`, `select`, `radio`, `checkbox`, `user`. The YAML for the kitchen-sink default lives in [`kitchen_sink_template.ts`](./kitchen_sink_template.ts). |
| `--templateUsagePercent` | `50` | Percentage (0–100) of generated cases that should be linked to one of the available templates for their owner |
| `--legacyCustomFields` | `false` | Register typed customFields (`text` / `toggle` / `number`) on the cases-configure SO for every `--owners` × space combination, and have every generated case POST matching `customFields` values. Independent of YAML templates — works alongside or instead of `--templates`. |
| `--legacyTemplates` | `false` | Register legacy templates on the cases-configure SO for every `--owners` × space combination. Visible in the Cases UI as "Create from template"; not auto-applied to generated cases (the case API has no legacy-template reference field). When combined with `--legacyCustomFields`, the legacy templates pre-fill values for the registered typed customFields. |
| `--dryRun` | `false` | Print the execution plan and exit without writing |
| `--seed` | unset | Deterministic seed for repeatable plans/data |
| `--kibanaVersion` | `9.2.0` | Stamped into generated alert/event docs |
| `--concurrency` | auto | Concurrent case-create requests (auto: ~10 with attachments, ~30 without) |
| `--cleanup` | `false` | Delete previously generated cases/templates and exit |
| `--cleanupTag` | `auto-generated` | Tag used to identify what cleanup deletes |
| `--cleanupSpaces` | unset (= every space) | Comma-separated space IDs to scope `--cleanup` to. Blank = every Kibana space. |

Run with `--help` to see the full yargs help output.

## Notes

- `--alerts > 0` writes alert docs into `.alerts-security.alerts-<space>` (security/cases owners) or `.alerts-observability.metrics.alerts-<space>` (observability owner). If the target index already contains enough docs to cover the request, the run **reuses** them and skips indexing; if it has some but not enough, the run **tops up** the missing delta. Same policy applies to events (`logs-endpoint.events.process-default`).
- `--events > 0` writes process events into `logs-endpoint.events.process-default`. Observability-owned cases skip event attachments.
- `--numSpaces` is **additive**: the default space always participates so a fresh demo dataset shows up in the space users land in first. Setting `--numSpaces 3` generates into the default space + three newly created spaces (four spaces total).
- `--cleanup` is **global by default**: it discovers every Kibana space via the spaces API and removes anything tagged `--cleanupTag` from each. Pass `--cleanupSpaces "default,analytics-1"` to scope it.
- `--templateUsagePercent` controls how many cases pick up a template — the rest stay vanilla so the dataset reflects a realistic mix.
- Templates are space-scoped saved objects, so a copy of every template is created in **every** target space. With `--numSpaces 3 --templates 2 --templateOwners securitySolution,cases`, that's `2 × 2 × 4 = 16` template POSTs (4 spaces = default + 3 generated). `--cleanup` removes them per-space the same way.
- The default template (when `--templates > 0` and `--templateFieldTypes` is omitted) is the rich kitchen-sink YAML in [`kitchen_sink_template.ts`](./kitchen_sink_template.ts), which exercises every Cases template feature (display rules, validation, compound conditions, options, defaults, etc.). Edit that YAML in place to change the default; templates and the cases linked to them automatically pick up the change.
- `--legacyCustomFields` and `--legacyTemplates` write to the **cases-configure saved object** (not the YAML templates index). The script's customField keys (`incident_summary`, `follow_up_actions`, `requires_postmortem`, `customer_impact_confirmed`, `sla_minutes`, `affected_user_count`) and legacy template keys (`legacy-incident-low`, `legacy-incident-high`, `legacy-incident-postmortem`) are stable so reruns replace in place rather than duplicate, and `--cleanup` strips just those entries while leaving manually-added customFields/templates untouched. The full registration list lives in [`configure_customfields.ts`](./configure_customfields.ts) — edit there to change which fields/templates ship.
- `--seed` only makes the *plan* and randomized field choices reproducible; UUIDs and timestamps are still fresh per run.

## Tests

```bash
node scripts/jest x-pack/platform/plugins/shared/cases/scripts/cases_generator
```
