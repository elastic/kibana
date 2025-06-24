# @kbn/kibana-api-cli

Exposes a Kibana API client for usage in scripts. It:

- attempts to automatically discover Kibana, using localhost and some common credentials
- sets the right headers to be able to talk to the API
- exposes an Elasticsearch client that uses the /api/console/proxy endpoint

Usage:

```ts
import { ToolingLog } from '@kbn/tooling-log';
import { InferenceConnector } from '@kbn/inference-common';

export async function getConnectors({ log, signal }:{log:ToolingLog; signal:AbortSignal }): Promise<InferenceConnector[]> {

  await createKibanaClient({ log, signal }));

  const { connectors } = await kibanaClient.fetch<{
    connectors: InferenceConnector[];
  }>('/internal/inference/connectors');

  return connectors;
}
```
