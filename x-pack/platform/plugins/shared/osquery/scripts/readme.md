# Osquery Scripts

## Synthetic Data Generator (`create_actions/`)

Creates synthetic osquery action and response documents for performance testing and development.

```bash
node x-pack/platform/plugins/shared/osquery/scripts/create_actions [options]
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `--count, -c` | 500 | Number of action documents to create |
| `--packRatio, --pr` | 0.2 | Fraction of actions that are pack queries (0.0-1.0) |
| `--queriesPerPack` | 5 | Number of sub-queries per pack action |
| `--minAgents` | 1 | Minimum agents per action |
| `--maxAgents` | 40 | Maximum agents per action (randomized between min and max) |
| `--errorRate, --er` | 0.25 | Fraction of responses that are errors (0.0-1.0) |
| `--users, -u` | 5 | Number of unique synthetic user profiles |
| `--cases` | 15 | Number of real cases to create via Cases API |
| `--caseRatio` | 0.3 | Fraction of actions with case_ids attached (0.0-1.0) |
| `--delete, -d` | false | Delete previously generated synthetic data first |
| `--deleteOnly` | false | Only delete existing synthetic data, do not create new |
| `--es, -e` | `http://elastic:changeme@127.0.0.1:9200` | Elasticsearch URL |
| `--kibana, -k` | `http://elastic:changeme@127.0.0.1:5601` | Kibana URL (for Cases API) |
| `--batchSize, --bs` | 500 | Documents per bulk request |

### Examples

```bash
# Default run - 500 actions with randomized settings
node x-pack/platform/plugins/shared/osquery/scripts/create_actions

# Clean slate with 1000 actions
node x-pack/platform/plugins/shared/osquery/scripts/create_actions --count 1000 --delete

# Stress test - 10k pack actions, 100 agents each, all with cases
node x-pack/platform/plugins/shared/osquery/scripts/create_actions \
  --count 10000 \
  --packRatio 1.0 \
  --queriesPerPack 10 \
  --minAgents 100 --maxAgents 100 \
  --caseRatio 1.0 \
  --delete
```

---

## Schema Formatter (`schema_formatter/`)

Extracts only the currently used fields from osquery schema files (manually curated selection). Output goes to `public/editor/osquery_schema`.

```bash
node x-pack/platform/plugins/shared/osquery/scripts/schema_formatter/ecs.js --schema_version=4.6.0
node x-pack/platform/plugins/shared/osquery/scripts/schema_formatter/osquery.js --schema_version=4.6.0
```

Note: CSV exports may have capitalized field names that need to be transformed to lowercase.
