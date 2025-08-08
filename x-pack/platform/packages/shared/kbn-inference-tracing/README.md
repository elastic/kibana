# @kbn/inference-tracing

Utilities for capturing GenAI / LLM traces in Kibana and exporting them to observability back-ends. Currently supported are Phoenix and Langfuse.

## 1. Configure an exporter

Attach one of the provided span processors to your (global) OpenTelemetry `NodeTracerProvider`.

Commonly, these are configured in `@kbn/tracing`, which will be included by requiring `src/cli/apm.js`.

### Phoenix

```ts
import { PhoenixSpanProcessor } from '@kbn/inference-tracing';

provider.addSpanProcessor(
  new PhoenixSpanProcessor({
    base_url: 'https://api.phoenix.dev', // ingestion endpoint
    public_url: 'https://app.phoenix.dev', // optional – used to build UI links
    project_name: 'my-project', // optional – defaults to first project
    api_key: process.env.PHOENIX_API_KEY, // optional
    scheduled_delay: 2_000,
  })
);
```

### Langfuse

```ts
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { LangfuseSpanProcessor } from '@kbn/inference-tracing';

const provider = new NodeTracerProvider();
provider.addSpanProcessor(
  new LangfuseSpanProcessor({
    base_url: 'https://app.langfuse.com', // Langfuse UI / server
    public_key: process.env.LANGFUSE_PUBLIC_KEY!, // API credentials
    secret_key: process.env.LANGFUSE_SECRET_KEY!,
    scheduled_delay: 2_000, // flush interval (ms)
  })
);
provider.register();
```

Both processors transform spans into the format understood by the back-end and log a handy “View trace at ...” link when a root span finishes.

## 2. Instrument your code with helper functions

The **with...Span** helpers create an active span, run your callback, and automatically:

- set span status to OK / Error,
- record exceptions,
- wait for Promises or RxJS Observables to settle before ending the span.

Helper overview:

| Helper                              | Typical use-case                  |
| ----------------------------------- | --------------------------------- |
| `withInferenceSpan(options, cb)`    | Generic wrapper for any operation |
| `withChatCompleteSpan(options, cb)` | Chat completion calls             |
| `withExecuteToolSpan(options, cb)`  | Tool execution calls              |

### Examples

```ts
// Generic
return withInferenceSpan('getWeather', () => callLLM());

// Chat completion
await withChatCompleteSpan(
  { system, messages, model },
  () => inferenceClient.chatComplete(...)
);
```

All helpers return the value returned by `cb`, so you can simply `return` their result from your own function.
