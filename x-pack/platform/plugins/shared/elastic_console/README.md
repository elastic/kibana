# Elastic Ramen (Elastic Console Plugin)

> **Experimental** — this feature is under active development and may change without notice.

An OpenAI-compatible proxy that routes requests through Kibana-configured AI connectors. External tools (coding agents, CLI tools, IDE extensions) can talk to any Elasticsearch AI connector using the standard OpenAI chat completions API.

## Enabling

The plugin is gated behind **both** a feature flag and an advanced setting:

1. **Feature flag**: `elasticConsole.enabled` must be `true`. In local dev, add to `kibana.dev.yml`:
   ```yaml
   feature_flags.overrides:
     elasticConsole.enabled: true
   ```
2. **Advanced setting**: Go to **Stack Management > Advanced Settings**, search for **Elastic Ramen**, and toggle `elasticRamen:enabled` to `true`.

Until both are enabled, every route returns `404`.

## Authentication

All API routes require a valid Kibana session or API key. The easiest way to get started is the **one-click setup** endpoint or UI page (see below).

### Setup endpoint

```
POST /internal/elastic_ramen/setup
```

Returns:
```json
{
  "elasticsearchUrl": "https://my-cluster.es.cloud:443",
  "kibanaUrl": "https://my-cluster.kb.cloud:443",
  "apiKeyEncoded": "base64-encoded-api-key"
}
```

The API key is scoped to the calling user's privileges and expires after 30 days.

### Setup UI

Navigate to `/app/elasticRamen` in Kibana. Click **Generate credentials** to create an API key. The page will:

1. Attempt to auto-deliver credentials to a local agent at `http://localhost:14642/config`
2. Fall back to displaying the credentials for manual copy if no local agent is found

## Required headers

All routes are internal Kibana APIs. Clients must include:

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `ApiKey <base64-encoded-key>` or Kibana session cookie |
| `x-elastic-internal-origin` | Yes | Must be `kibana`. Identifies the request as an internal API call. |
| `kbn-xsrf` | POST/PUT only | Any non-empty value (e.g. `true`). Required for non-GET requests. |
| `x-connector-id` | No | Override the connector ID to use for chat completions |

### Example: curl

```bash
curl -X POST "https://my-kibana:5601/internal/elastic_ramen/v1/chat/completions" \
  -H "Authorization: ApiKey YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "x-elastic-internal-origin: kibana" \
  -H "kbn-xsrf: true" \
  -d '{
    "model": "default",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

## API Endpoints

### List models

```
GET /internal/elastic_ramen/v1/models
```

Returns available AI connectors in OpenAI model list format:

```json
{
  "object": "list",
  "data": [
    {
      "id": "connector-id-1",
      "object": "model",
      "owned_by": ".gen-ai",
      ...
    }
  ]
}
```

### Chat completions

```
POST /internal/elastic_ramen/v1/chat/completions
```

OpenAI-compatible chat completions endpoint. Supports:

- **Streaming** (`"stream": true`) — returns `text/event-stream` with SSE chunks
- **Non-streaming** (`"stream": false`) — returns a single JSON response
- **Tools/function calling** — pass `tools` array and `tool_choice`
- **Multi-turn conversations** — include full message history with `assistant` and `tool` role messages
- **Image content** — base64 data URIs in user message content arrays

#### Request body

```json
{
  "model": "default",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "stream": true,
  "temperature": 0.7,
  "tools": [],
  "tool_choice": "auto"
}
```

#### Connector resolution

The `model` field is used to resolve which AI connector to use:

1. If an `x-connector-id` header is present, that connector ID is used
2. Otherwise, the `model` value is tried as a connector ID
3. If neither works, the default inference connector is used
4. As a last resort, the first available connector is used

Use `"model": "default"` to always use the default connector.

### Conversations

CRUD endpoints for managing chat conversations stored in Elasticsearch.

#### List conversations

```
GET /internal/elastic_ramen/conversations?agent_id=<optional>
```

Returns conversations for the current space, sorted by `updated_at` descending (max 100). The `conversation_rounds` field is excluded from list results.

#### Get conversation

```
GET /internal/elastic_ramen/conversations/:id
```

Returns a single conversation with full `conversation_rounds`.

#### Create conversation

```
POST /internal/elastic_ramen/conversations
```

Body:
```json
{
  "agent_id": "my-agent",
  "title": "New conversation",
  "conversation_rounds": []
}
```

Returns `{ "id": "generated-uuid" }`.

#### Update conversation

```
PUT /internal/elastic_ramen/conversations/:id
```

Body (all fields optional):
```json
{
  "title": "Updated title",
  "conversation_rounds": [...]
}
```

Returns `{ "id": "conversation-id" }`.

## Configuration for external tools

### OpenAI SDK (Python)

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://my-kibana:5601/internal/elastic_ramen/v1",
    api_key="YOUR_API_KEY",
    default_headers={
        "x-elastic-internal-origin": "kibana",
        "kbn-xsrf": "true",
    },
)

response = client.chat.completions.create(
    model="default",
    messages=[{"role": "user", "content": "Hello!"}],
)
print(response.choices[0].message.content)
```

### OpenAI SDK (TypeScript/Node)

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://my-kibana:5601/internal/elastic_ramen/v1',
  apiKey: 'YOUR_API_KEY',
  defaultHeaders: {
    'x-elastic-internal-origin': 'kibana',
    'kbn-xsrf': 'true',
  },
});

const response = await client.chat.completions.create({
  model: 'default',
  messages: [{ role: 'user', content: 'Hello!' }],
});
console.log(response.choices[0].message.content);
```

### Claude Code / other agents

Set the base URL to `https://my-kibana:5601/internal/elastic_ramen/v1` and use the API key from the setup endpoint. Include `x-elastic-internal-origin: kibana` in all requests, and include `kbn-xsrf: true` for non-GET requests.

## Development

The plugin lives at `x-pack/platform/plugins/shared/elastic_console/`.

### Type check
```
yarn test:type_check --project x-pack/platform/plugins/shared/elastic_console/tsconfig.json
```

### Lint
```
node scripts/eslint --fix x-pack/platform/plugins/shared/elastic_console/
```
