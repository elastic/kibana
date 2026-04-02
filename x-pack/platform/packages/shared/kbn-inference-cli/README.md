# @kbn/inference-cli

Exposes an Inference (plugin) API client for scripts, that mimicks the `chatComplete`
and `output` APIs that are available on its start contract. It depends on the KibanaClient
that is exposed from the `@kbn/kibana-api-cli` package. It automatically selects a
connector if available. Usage:

```ts
import { createInferenceClient } from '@kbn/inference-cli';
import { ToolingLog } from '@kbn/tooling-log';

const log = new ToolingLog();
const inferenceClient = await createInferenceClient({
  log,
  // pass in a signal that is triggered on teardown
  signal: new AbortController().signal,
});

const response = await inferenceClient.output({
  id: 'extract_personal_details',
  input: `Sarah is a 29-year-old software developer living in San Francisco.`,
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
      city: { type: 'string' },
    },
    required: ['name'],
  } as const,
});

log.info(response.output);
```

Running a recipe:

```bash
yarn run ts-node x-pack/solutions/observability/packages/kbn-genai-cli/recipes/hello_world.ts
```

## EIS

You can connect your local Elasticsearch to the Elastic Inference Service (EIS) using Cloud Connect (aka. Cloud Connected Mode, CCM) by running `node scripts/eis.js`. This script configures your local Elasticsearch instance to use a real EIS endpoint without needing to run EIS locally.

### Prerequisites

1. **Elasticsearch**: Start Elasticsearch with the EIS URL of the QA environment and an Enterprise trial license:

   ```bash
   yarn es snapshot --license trial -E xpack.inference.elastic.url=https://inference.eu-west-1.aws.svc.qa.elastic.cloud
   ```

2. **Vault Access**: The script fetches the EIS API key from Vault. Make sure you are logged in:

   ```bash
   VAULT_ADDR=https://secrets.elastic.co:8200 vault login --method oidc
   ```

   See [Infra Vault docs](https://docs.elastic.dev/vault#infra-vault) for setup.

   Alternatively, if you already have a key, you can skip Vault entirely by setting:

   ```bash
   export KIBANA_EIS_CCM_API_KEY=<your-key>
   ```

3. **Credentials**: The script automatically detects Elasticsearch credentials from:
   - Environment variables: `ES_USERNAME`/`ES_PASSWORD` or `ELASTICSEARCH_USERNAME`/`ELASTICSEARCH_PASSWORD`
   - Default credentials: `elastic:changeme` (stateful) or `elastic_serverless:changeme` (serverless)

4. **Custom host/port** (optional): By default the script connects to `localhost:9200` (trying both HTTPS and HTTP). Override with:

   ```bash
   export ES_HOST=my-host              # tries both HTTPS and HTTP
   export ES_HOST=https://my-host      # uses HTTPS only
   export ES_PORT=9220
   ```

### Usage

```bash
# Terminal 1: Start Elasticsearch with the EIS URL
yarn es snapshot --license trial -E xpack.inference.elastic.url=https://inference.eu-west-1.aws.svc.qa.elastic.cloud

# Terminal 2: Configure EIS API key, once Elasticsearch is green
node scripts/eis.js
```

The script will:
1. Connect to Elasticsearch and log the endpoint and credentials it found
2. Check if the EIS endpoint (`xpack.inference.elastic.url`) is configured
3. Fetch the CCM API key (from `KIBANA_EIS_CCM_API_KEY` env var, or from Vault)
4. Register the key in Elasticsearch via the CCM API

**Important**: the script only enables EIS. It does not go through the full Cloud Connect onboarding. The cluster will not show as connected on the Cloud Connect page in Kibana. However, you should have access to all built-in EIS inference endpoints after running this script.
