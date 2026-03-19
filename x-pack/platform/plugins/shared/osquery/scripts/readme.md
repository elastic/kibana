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

## Compliance Data Seeder (`seed_compliance_data.sh`)

Seeds realistic endpoint compliance findings and score history into Elasticsearch for development and demo of the Endpoint Compliance Monitoring feature.

**Prerequisites:**
- Elasticsearch running (default: `localhost:9200`)
- Kibana started with the feature flag: `xpack.osquery.experimentalFeatures.endpointComplianceMonitoring: true`

```bash
# Default: 8 hosts, 3 days of history
./x-pack/platform/plugins/shared/osquery/scripts/seed_compliance_data.sh

# Custom fleet size and history depth
./x-pack/platform/plugins/shared/osquery/scripts/seed_compliance_data.sh --hosts 20 --days 7

# Clean existing data and re-seed
./x-pack/platform/plugins/shared/osquery/scripts/seed_compliance_data.sh --clean

# With API key auth
ES_URL=https://my-cluster.es.cloud:443 ES_API_KEY=abc123 \
  ./x-pack/platform/plugins/shared/osquery/scripts/seed_compliance_data.sh
```

### What it creates

| Data stream | Content |
|---|---|
| `logs-endpoint_compliance.findings-default` | Individual compliance check results (pass/fail/N/A) per host per rule |
| `logs-endpoint_compliance.scores-default` | Aggregated benchmark scores over time |
| `endpoint_compliance.findings_latest-default` | Latest finding per rule+host (populated by transform, ~60s delay) |

### Seeded benchmarks

| Benchmark | Platform | Rules |
|---|---|---|
| CIS macOS 15.0 Sequoia | macOS | 10 |
| CIS Windows 11 Enterprise | Windows | 10 |
| CIS Ubuntu Linux 22.04 LTS | Linux | 10 |

### Options

| Option | Default | Description |
|---|---|---|
| `--hosts` | 8 | Number of simulated hosts (distributed across macOS/Windows/Linux) |
| `--days` | 3 | Days of historical data (evaluations every 6 hours) |
| `--clean` | false | Delete all compliance data before seeding |

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `ES_URL` | `http://localhost:9200` | Elasticsearch URL |
| `ES_API_KEY` | — | API key auth (takes precedence) |
| `ES_USERNAME` | `elastic` | Basic auth username |
| `ES_PASSWORD` | `changeme` | Basic auth password |

---

## GCP E2E Deployment (`gcp/`)

Deploys a full end-to-end compliance monitoring stack on GCP: Fleet Server + Osquery Agents + compliance packs — all wired to your Elasticsearch/Kibana cluster.

### Architecture

```
┌─────────────────────┐     ┌──────────────────────┐
│   Elasticsearch     │◄────│    Kibana             │
│   (Cloud / local)   │     │  (Cloud / local)      │
└────────▲────────────┘     └──────────────────────┘
         │                           ▲
         │ results, findings         │ Fleet API
         │                           │
    ┌────┴──────────────────────┐    │
    │   Fleet Server (GCP VM)   │◄───┘
    │   e2-medium, Ubuntu 22.04 │
    └────────▲──────────────────┘
             │ enrollment
    ┌────────┴──────────────────────────────────────┐
    │           Agent VMs (GCP)                      │
    │  ┌─────────┐ ┌─────────┐ ┌─────────┐         │
    │  │Ubuntu 22│ │Debian 12│ │Ubuntu 22│  ...     │
    │  │ osquery │ │ osquery │ │ osquery │          │
    │  └─────────┘ └─────────┘ └─────────┘         │
    └───────────────────────────────────────────────┘
```

### Prerequisites

- **gcloud CLI** installed and authenticated (`gcloud auth login`)
- **GCP Project** with Compute Engine API enabled
- **Elasticsearch + Kibana** accessible from GCP VMs (Elastic Cloud recommended, or use a tunnel)

### Quick Start (one command)

```bash
export GCP_PROJECT=my-gcp-project
export ES_URL=https://my-cluster.es.cloud:443
export KIBANA_URL=https://my-cluster.kb.cloud:443
export ES_USERNAME=elastic
export ES_PASSWORD=changeme
export STACK_VERSION=9.0.0

# Deploy everything: Fleet Server + 3 agents + compliance packs + sample data
./x-pack/platform/plugins/shared/osquery/scripts/gcp/deploy_all.sh

# Deploy with 6 agents
./x-pack/platform/plugins/shared/osquery/scripts/gcp/deploy_all.sh --agents 6

# Tear down everything when done
./x-pack/platform/plugins/shared/osquery/scripts/gcp/teardown.sh
```

### Step-by-Step

```bash
cd x-pack/platform/plugins/shared/osquery/scripts/gcp

# Step 1: Deploy Fleet Server
./deploy_fleet_server.sh

# Step 2: Deploy Osquery Agents (reads Fleet state automatically)
AGENT_COUNT=3 ./deploy_osquery_agents.sh

# Step 3: Deploy compliance osquery packs
./deploy_compliance_packs.sh

# Step 4 (optional): Seed historical sample data
../seed_compliance_data.sh --days 3
```

### Scripts

| Script | Purpose |
|---|---|
| `deploy_all.sh` | One-command orchestrator (runs all steps) |
| `deploy_fleet_server.sh` | Creates Fleet Server agent policy + GCP VM |
| `deploy_osquery_agents.sh` | Creates agent policy with osquery + N GCP VMs |
| `deploy_compliance_packs.sh` | Creates compliance osquery packs via Kibana API |
| `teardown.sh` | Deletes all GCP VMs, firewall rules, Kibana policies |
| `env.sh` | Shared config and helper functions |

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GCP_PROJECT` | (required) | GCP project ID |
| `GCP_ZONE` | `us-central1-a` | GCP zone for VMs |
| `STACK_VERSION` | `9.0.0` | Elastic Agent version to install |
| `ES_URL` | (required) | Elasticsearch URL |
| `KIBANA_URL` | (required) | Kibana URL |
| `ES_USERNAME` | `elastic` | Auth username |
| `ES_PASSWORD` | `changeme` | Auth password |
| `AGENT_COUNT` | `3` | Number of agent VMs to create |
| `FLEET_SERVER_MACHINE_TYPE` | `e2-medium` | GCP machine type for Fleet Server |
| `AGENT_MACHINE_TYPE` | `e2-small` | GCP machine type for agents |

### Data Flow (E2E)

1. **Packs deployed** → osquery integration receives compliance queries
2. **Osquery executes** → results written to `logs-osquery_manager.result-default`
3. **Finding Evaluator** (Kibana server) → polls results, evaluates pass/fail/N/A, writes to `logs-endpoint_compliance.findings-default`
4. **Transform** → deduplicates to `endpoint_compliance.findings_latest-default`
5. **Score Aggregation** (Task Manager) → computes per-benchmark scores to `logs-endpoint_compliance.scores-default`
6. **Dashboard** → reads from latest findings + scores indices

First real findings appear ~5-10 minutes after deployment.

### Cost

Typical cost for a development session:

| Resource | Spec | ~Cost/hour |
|---|---|---|
| Fleet Server | e2-medium (2 vCPU, 4GB) | $0.034 |
| Agent VMs (x3) | e2-small (2 vCPU, 2GB) | $0.050 |
| **Total** | 4 VMs | **~$0.08/hour** |

Always run `teardown.sh` when done to avoid charges.

---

## Schema Formatter (`schema_formatter/`)

Extracts only the currently used fields from osquery schema files (manually curated selection). Output goes to `public/editor/osquery_schema`.

```bash
node x-pack/platform/plugins/shared/osquery/scripts/schema_formatter/ecs.js --schema_version=4.6.0
node x-pack/platform/plugins/shared/osquery/scripts/schema_formatter/osquery.js --schema_version=4.6.0
```

Note: CSV exports may have capitalized field names that need to be transformed to lowercase.
