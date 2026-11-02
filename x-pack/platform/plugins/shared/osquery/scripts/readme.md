# Osquery Scripts

## Synthetic Data Generator (`create_actions/`)

Creates synthetic osquery action, response, result, and scheduled response documents for performance testing and development.

The script populates three Elasticsearch data streams:

- **Actions** (`.logs-osquery_manager.actions-default`) -- on-demand and pack queries with agents, users, cases
- **Responses** (`logs-osquery_manager.action.responses-default`) -- per-agent query responses (on-demand + scheduled)
- **Results** (`logs-osquery_manager.result-default`) -- individual result rows with realistic osquery column data

```bash
node x-pack/platform/plugins/shared/osquery/scripts/create_actions [options]
```

### Options

#### Actions & Responses

| Option | Default | Description |
|--------|---------|-------------|
| `--count, -c` | 500 | Number of action documents to create |
| `--packRatio, --pr` | 0.2 | Fraction of actions that are pack queries (0.0-1.0) |
| `--queriesPerPack` | 5 | Number of sub-queries per pack action |
| `--minAgents` | 1 | Minimum agents per action |
| `--maxAgents` | 40 | Maximum agents per action (randomized between min and max) |
| `--errorRate, --er` | 0.25 | Fraction of responses that are errors (0.0-1.0) |
| `--users, -u` | 5 | Number of unique synthetic user profiles |
| `--ruleRatio, --rr` | 0.1 | Fraction of actions that are rule-triggered with no user_id (0.0-1.0) |
| `--cases` | 15 | Number of real cases to create via Cases API |
| `--caseRatio` | 0.3 | Fraction of actions with case_ids attached (0.0-1.0) |

#### Results

| Option | Default | Description |
|--------|---------|-------------|
| `--results, -r` | true | Generate mock result documents in the results index |
| `--maxResultRows` | 50 | Maximum result rows per agent per query (randomized 1 to N) |

#### Scheduled Responses

Scheduled responses simulate periodic pack execution over the last 30 days. Each document includes `space_id`, `pack_id`, `pack_name`, and `schedule_id` to mirror real scheduled query data.

| Option | Default | Description |
|--------|---------|-------------|
| `--scheduled` | true | Generate scheduled response documents |
| `--scheduledPacks` | 5 | Number of simulated scheduled packs |
| `--scheduledQueriesPerPack` | 5 | Queries per scheduled pack |
| `--scheduledExecutions` | 200 | Total execution cycles to generate per query |
| `--scheduledAgents` | 10 | Number of agents reporting per scheduled execution |
| `--scheduledErrorRate` | 0.05 | Fraction of scheduled responses that are errors (0.0-1.0) |

Total scheduled docs = `scheduledPacks × scheduledQueriesPerPack × scheduledExecutions × scheduledAgents`.

#### Infrastructure

| Option | Default | Description |
|--------|---------|-------------|
| `--es, -e` | `http://elastic:changeme@127.0.0.1:9200` | Elasticsearch URL |
| `--kibana, -k` | `http://elastic:changeme@127.0.0.1:5601` | Kibana URL (for Cases API) |
| `--batchSize, --bs` | 500 | Documents per bulk request |
| `--delete, -d` | false | Delete previously generated synthetic data first |
| `--deleteOnly` | false | Only delete existing synthetic data, do not create new |

### Examples

```bash
# Default run - 500 actions + responses + results + scheduled responses
node x-pack/platform/plugins/shared/osquery/scripts/create_actions

# Clean slate with 1000 actions
node x-pack/platform/plugins/shared/osquery/scripts/create_actions --count 1000 --delete

# Only delete all previously generated synthetic data (actions, responses, results, cases)
node x-pack/platform/plugins/shared/osquery/scripts/create_actions --deleteOnly

# Stress test - 10k pack actions, 100 agents each, all with cases
node x-pack/platform/plugins/shared/osquery/scripts/create_actions \
  --count 10000 \
  --packRatio 1.0 \
  --queriesPerPack 10 \
  --minAgents 100 --maxAgents 100 \
  --caseRatio 1.0 \
  --delete

# Actions only - skip results and scheduled responses
node x-pack/platform/plugins/shared/osquery/scripts/create_actions \
  --no-results \
  --no-scheduled

# Heavy scheduled data - 10 packs, 10 queries each, 500 executions, 50 agents (2.5M docs)
node x-pack/platform/plugins/shared/osquery/scripts/create_actions \
  --count 100 \
  --scheduledPacks 10 \
  --scheduledQueriesPerPack 10 \
  --scheduledExecutions 500 \
  --scheduledAgents 50 \
  --delete

# High error-rate scenario for testing error handling UI
node x-pack/platform/plugins/shared/osquery/scripts/create_actions \
  --count 200 \
  --errorRate 0.8 \
  --scheduledErrorRate 0.5

# Custom Elasticsearch/Kibana endpoints
node x-pack/platform/plugins/shared/osquery/scripts/create_actions \
  --es http://elastic:changeme@localhost:9220 \
  --kibana http://elastic:changeme@localhost:5620
```

---

## Schema Formatter (`schema_formatter/`)

Extracts only the currently used fields from osquery schema files (manually curated selection). Output goes to `public/editor/osquery_schema`.

```bash
node x-pack/platform/plugins/shared/osquery/scripts/schema_formatter/ecs.js --schema_version=4.6.0
node x-pack/platform/plugins/shared/osquery/scripts/schema_formatter/osquery.js --schema_version=4.6.0
```

Note: CSV exports may have capitalized field names that need to be transformed to lowercase.
