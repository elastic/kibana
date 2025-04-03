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
