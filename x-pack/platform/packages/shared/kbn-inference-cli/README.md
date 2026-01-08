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

You can connect your local Elasticsearch to the Elastic Inference Service (EIS) using Cloud Connected Mode (CCM) by running `node scripts/eis.js`. This script configures your local Elasticsearch instance to use a real EIS endpoint without needing to run the EIS Gateway locally.

### Prerequisites

1. **Vault Access**: Make sure you have configured Vault to point at Elastic's [Infra Vault](https://docs.elastic.dev/vault#infra-vault) server and that you're logged in via `vault login --method oidc`. The script will fetch the EIS API key from `secret/kibana-issues/dev/inference/kibana-eis-ccm`.

2. **Elasticsearch**: Start Elasticsearch with the CCM URL flag:

   ```bash
   yarn es snapshot --license trial -E xpack.inference.elastic.url=https://inference.eu-west-1.aws.svc.qa.elastic.cloud
   ```

3. **Credentials**: The script will automatically detect Elasticsearch credentials from:
   - Environment variables: `ES_USERNAME`/`ES_PASSWORD` or `ELASTICSEARCH_USERNAME`/`ELASTICSEARCH_PASSWORD`
   - Default credentials: `elastic:changeme` (hosted) or `elastic_serverless:changeme` (serverless)

### Usage

```bash
# Start Elasticsearch with CCM enabled
yarn es snapshot --license trial -E xpack.inference.elastic.url=https://inference.eu-west-1.aws.svc.qa.elastic.cloud

# In a separate terminal, configure CCM
node scripts/eis.js
```

The script will fetch the API key from Vault and configure Cloud Connected Mode in your local Elasticsearch instance.
