# Message-only chat requests

`POST /api/chat/converse`, `POST /api/chat/converse/async` (API version
`2023-10-31`), and `POST /internal/agent_builder/converse/callback` (version `1`)
accept `trigger_mode: "never"` to persist text or attachments without executing an
agent. The chat endpoints retain their experimental feature gate and existing
privileges. Callers target new or existing event-native conversations.

```json
{
  "trigger_mode": "never",
  "input": "We increased the pool limit to 200",
  "conversation_id": "696ccd6d-4bff-4b26-a62e-522ccf2dcd16"
}
```

Omit `conversation_id` to create a conversation. The default title is retained.
The synchronous and callback endpoints return HTTP 200:

```json
{
  "conversation_id": "696ccd6d-4bff-4b26-a62e-522ccf2dcd16",
  "message_id": "715acd23-1a2a-42d8-a2a1-1f024fd8099f"
}
```

The streaming endpoint sends one `message_persisted` SSE with this acknowledgement
in its `data` payload, then closes. The message is available in conversation event
reads and in context for subsequent agent executions. It has no corresponding
round or execution.

Message-only requests are context writes only. They do not answer pending
human-in-the-loop prompts, clear `pending_prompts`, or resume a paused round.
When a conversation is awaiting a prompt response, only a later executing request
with explicit `prompts` entries for the pending prompt IDs can continue that
paused execution.

Provide at least nonblank `input` or one attachment. Attachments use the normal
converse attachment schema and are committed together with the message. Optional
`origin` uses `{ "type": "slack", "external_conversation_id": "...", "author":
{ "id": "...", "username": "...", "full_name": "..." } }`. External authorship
is attribution; authorization still uses the authenticated Kibana caller.

Message-only mode rejects explicit `prompts`, `action`, `_execution_mode`,
`execution_id`, `connector_id`, `inference_id`, `browser_api_tools`,
`configuration_overrides`, and `project_routing`, with HTTP 400.

Public message-only requests append a new event on every accepted request, including
retries. Callback requests still require `execution_idempotency_key` (1–256
characters). Its existing space/conversation/origin scoping determines the stable
message identity; replay returns the original acknowledgement without another
write. The callback URL is optional and unused in this mode.

Omitting `trigger_mode`, or selecting `"always"`, preserves agent execution and
its existing response. Callback triggering requests require both `callback.url`
and `execution_idempotency_key`, return HTTP 202 `{ "execution_id": "..." }`, and
execute through Task Manager with callback delivery. Chat triggering requests
retain local, Task Manager, and automatic execution placement. `"auto"` is not a
supported trigger mode. The legacy `/api/agent_builder/converse` endpoints do not
accept these new request fields.
