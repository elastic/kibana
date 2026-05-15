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

# Tear down everything created earlier in this space
node x-pack/platform/plugins/shared/cases/scripts/generate_cases.js --cleanup
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

# Create 3 templates with custom fields, in addition to cases
node x-pack/platform/plugins/shared/cases/scripts/generate_cases.js \
  -c 10 -t 3 --templateOwners securitySolution \
  --templateFieldTypes "keyword,integer,boolean"

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
| `-t, --templates` | `0` | Auto-generate N templates per owner (max 10) |
| `--templateOwners` | `--owners` | Owners to create templates under |
| `--templateSpace` | `--space` | Space for template creation |
| `--templateFieldTypes` | `''` | Field types per template, e.g. `keyword,integer,boolean` (valid: `keyword`, `integer`, `boolean`, `textarea`, `date`, `select`, `checkbox`, `radio`, `user`) |
| `--dryRun` | `false` | Print the execution plan and exit without writing |
| `--seed` | unset | Deterministic seed for repeatable plans/data |
| `--kibanaVersion` | `9.2.0` | Stamped into generated alert/event docs |
| `--concurrency` | auto | Concurrent case-create requests (auto: ~10 with attachments, ~30 without) |
| `--cleanup` | `false` | Delete previously generated cases/templates and exit |
| `--cleanupTag` | `auto-generated` | Tag used to identify what cleanup deletes |

Run with `--help` to see the full yargs help output.

## Notes

- `--alerts > 0` writes alert docs into `.alerts-security.alerts-<space>` (security/cases owners) or `.alerts-observability.metrics.alerts-<space>` (observability owner).
- `--events > 0` writes process events into `logs-endpoint.events.process-default`. Observability-owned cases skip event attachments.
- `--cleanup` deletes anything tagged `--cleanupTag` across the planned target spaces (and `--templateSpace`); it does not generate.
- `--seed` only makes the *plan* and randomized field choices reproducible; UUIDs and timestamps are still fresh per run.

## Tests

```bash
node scripts/jest x-pack/platform/plugins/shared/cases/scripts/cases_generator
```
