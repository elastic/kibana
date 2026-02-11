# Streams Agent

Server-only Kibana plugin that registers a **Streams Agent** in [Agent Builder](../../../packages/shared/agent-builder). The agent provides a conversational interface for querying and managing [Elastic Streams](../streams).

## Tools

The agent exposes 16 tools across three categories:

| Category | Tools |
|---|---|
| **Read** | `list_streams`, `get_stream`, `get_data_quality`, `get_schema`, `get_lifecycle_stats` |
| **Write** | `set_retention`, `fork_stream`, `delete_stream`, `update_processors`, `map_fields`, `enable_failure_store`, `update_settings` |
| **AI orchestration** | `suggest_partitions`, `generate_description`, `identify_features`, `identify_systems` |

Write tools follow a **preview → confirm → apply** protocol enforced via the agent's system instructions. AI orchestration tools call [`@kbn/streams-ai`](../../../packages/shared/kbn-streams-ai) functions directly using request-scoped clients.

## Dependencies

- **`streams`** — provides `getScopedClients()` for request-scoped access to `StreamsClient` and related services.
- **`agentBuilder`** — agent and tool registration APIs.
