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

```
$ yarn run ts-node x-pack/solutions/observability/packages/kbn-genai-cli/recipes/hello_world.ts
```

## EIS

You can set up a local instance of the Elastic Inference Service by running `node scripts/eis.js`.
This starts the EIS Gateway in a Docker container, and handles certificates and configuration.

### Prerequisites

EIS connects to external LLM providers, so you need to supply authentication. By default, the setup script will try to get credentials from Vault. Make sure you have configured Vault to point at Elastic's Infra Vault server, and that you're logged in. If you want to, you can run Vault locally and set VAULT_ADDR and VAULT_SECRET_PATH. By default the script will try to get credentials from the [Infra Vault](https://docs.elastic.dev/vault/infra-vault/home) cluster, at `secret/kibana-issues/dev/inference/*`, which is accessible for all employees.
